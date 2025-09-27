import React, { useState, useMemo, useEffect } from "react";
import { Search, Users, CheckCircle2, Clock, UserCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface GuestTableProps {
  data: any[];
  headers: string[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

export const GuestTable: React.FC<GuestTableProps> = ({
  data,
  headers,
  searchTerm,
  onSearchChange,
}) => {
  const [confirmedGuests, setConfirmedGuests] = useState<Set<string>>(
    new Set()
  );
  const [supabaseGuests, setSupabaseGuests] = useState<any[]>([]);
  const { toast } = useToast();

  // Load guests from Supabase on component mount
  useEffect(() => {
    loadGuestsFromSupabase();

    // Set up real-time subscription
    const channel = supabase
      .channel("schema-db-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "guests",
        },
        (payload) => {
          console.log("Real-time update:", payload);
          loadGuestsFromSupabase();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadGuestsFromSupabase = async () => {
    try {
      const { data: guests, error } = await supabase
        .from("guests")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (guests) {
        setSupabaseGuests(guests);
        // Update confirmed guests set
        const confirmed = new Set(
          guests.filter((g) => g.confirmed).map((g) => g.guest_id)
        );
        setConfirmedGuests(confirmed);
      }
    } catch (error: any) {
      console.error("Error loading guests:", error);
      toast({
        title: "Error al cargar datos",
        description:
          "No se pudieron cargar los invitados desde la base de datos.",
        variant: "destructive",
      });
    }
  };

  // Use Supabase data if available, otherwise use local data
  const currentData =
    supabaseGuests.length > 0
      ? supabaseGuests.map((g) => ({
          ...g.guest_data,
          _supabase_id: g.id,
          _guest_id: g.guest_id,
        }))
      : data;

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return currentData;

    return currentData.filter((row) =>
      Object.values(row).some((value) =>
        value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [currentData, searchTerm]);

  const handleConfirmGuest = async (guestId: string) => {
    try {
      const isCurrentlyConfirmed = confirmedGuests.has(guestId);

      const { error } = await supabase
        .from("guests")
        .update({
          confirmed: !isCurrentlyConfirmed,
          confirmed_at: !isCurrentlyConfirmed ? new Date().toISOString() : null,
        })
        .eq("guest_id", guestId);

      if (error) throw error;

      // Update local state
      setConfirmedGuests((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(guestId)) {
          newSet.delete(guestId);
        } else {
          newSet.add(guestId);
        }
        return newSet;
      });

      toast({
        title: isCurrentlyConfirmed
          ? "Confirmación cancelada"
          : "Invitado confirmado",
        description: `El invitado ${guestId} ha sido ${
          isCurrentlyConfirmed ? "des" : ""
        }confirmado.`,
      });
    } catch (error: any) {
      console.error("Error updating guest:", error);
      toast({
        title: "Error al actualizar",
        description: "No se pudo actualizar el estado del invitado.",
        variant: "destructive",
      });
    }
  };

  const getGuestId = (row: any, index: number): string => {
    // If this is from Supabase, use the _guest_id field
    if (row._guest_id) {
      return row._guest_id;
    }

    // Try to find a field that could be an ID
    const possibleIdFields = [
      "id",
      "ID",
      "Id",
      "código",
      "codigo",
      "Código",
      "Codigo",
    ];
    for (const field of possibleIdFields) {
      if (
        row[field] !== undefined &&
        row[field] !== null &&
        row[field] !== ""
      ) {
        return row[field].toString();
      }
    }
    // If no ID field found, use row index
    return `guest_${index}`;
  };

  // Función para reordenar las columnas según el orden especificado
  const getOrderedHeaders = (headers: string[]): string[] => {
    // Orden especificado por el usuario
    const desiredOrder = [
      "DNI",
      "Apellido",
      "Nombre",
      "Apellido y Nombre",
      "Grupo sanguíneo",
      "Teléfono",
      "Venís acompañado",
      "Apellido y Nombre del acompañante",
      "DNI Acompañante",
      "Contacto de Emergencia",
      "Tenés carnet Vigente?",
      "Tenés Seguro vigente?",
      "Cena show día sábado 11 (no incluye bebida)",
      "Tenés alguna restricción alimentaria?",
      "Moto en la que venís",
      "Ciudad de donde nos visitas",
      "Provincia",
      "Sos alérgico a algo?",
      "A que sos alérgico?",
      "Vas a realizar las rodadas",
    ];

    const orderedHeaders: string[] = [];

    // 1. Coincidencias exactas (case-insensitive)
    desiredOrder.forEach((desiredHeader) => {
      const exact = headers.find(
        (h) => h.trim().toLowerCase() === desiredHeader.trim().toLowerCase()
      );
      if (exact && !orderedHeaders.includes(exact)) {
        orderedHeaders.push(exact);
      }
    });

    // 2. Coincidencias parciales (case-insensitive)
    desiredOrder.forEach((desiredHeader) => {
      headers.forEach((h) => {
        if (
          !orderedHeaders.includes(h) &&
          (h.toLowerCase().includes(desiredHeader.toLowerCase()) ||
            desiredHeader.toLowerCase().includes(h.toLowerCase()))
        ) {
          orderedHeaders.push(h);
        }
      });
    });

    // 3. Agregar cualquier encabezado restante
    headers.forEach((h) => {
      if (!orderedHeaders.includes(h)) {
        orderedHeaders.push(h);
      }
    });

    return orderedHeaders;
  };

  if (currentData.length === 0) {
    return (
      <Card className="card-moto">
        <div className="text-center py-12">
          <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">
            No hay invitados cargados
          </h3>
          <p className="text-muted-foreground">
            Carga un archivo CSV o Excel para ver la lista de invitados
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <Card className="card-moto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar invitado por ID, nombre o cualquier campo..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Summary badges */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-border">
          <Badge variant="outline" className="text-xs">
            <Users className="h-3 w-3 mr-1" />
            Total: {currentData.length}
          </Badge>
          <Badge variant="outline" className="text-xs">
            <Search className="h-3 w-3 mr-1" />
            Filtrados: {filteredData.length}
          </Badge>
          <Badge variant="outline" className="text-xs">
            <UserCheck className="h-3 w-3 mr-1" />
            Confirmados: {confirmedGuests.size}
          </Badge>
        </div>
      </Card>

      {/* Results */}
      <Card className="card-moto">
        {filteredData.length === 0 && searchTerm ? (
          <div className="text-center py-12">
            <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Invitado no encontrado
            </h3>
            <p className="text-muted-foreground">
              No se encontraron resultados para "{searchTerm}"
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <Table className="w-full text-white text-sm sm:text-base">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px] sticky left-0 bg-background z-20 text-white">
                    Acción
                  </TableHead>
                  <TableHead className="w-[70px] sticky left-[80px] bg-background z-20 text-white">
                    Estado
                  </TableHead>
                  {getOrderedHeaders(
                    supabaseGuests.length > 0
                      ? Object.keys(supabaseGuests[0]?.guest_data || {})
                      : headers
                  ).map((header) => (
                    <TableHead
                      key={header}
                      className="min-w-[120px] text-white"
                    >
                      {header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((row, index) => {
                  const guestId = getGuestId(row, index);
                  const isConfirmed = confirmedGuests.has(guestId);
                  const orderedHeaders = getOrderedHeaders(
                    supabaseGuests.length > 0
                      ? Object.keys(supabaseGuests[0]?.guest_data || {})
                      : headers
                  );

                  return (
                    <TableRow
                      key={index}
                      className={
                        (isConfirmed ? "bg-success/10 " : "") +
                        " text-white text-xs sm:text-base"
                      }
                    >
                      <TableCell className="sticky left-0 bg-background z-10 text-white">
                        <Button
                          onClick={() => handleConfirmGuest(guestId)}
                          variant={isConfirmed ? "default" : "outline"}
                          size="sm"
                          className={`${
                            isConfirmed ? "bg-success hover:bg-success/90" : ""
                          } px-2 py-1 h-auto text-xs sm:text-sm`}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          <span className="hidden sm:inline">
                            {isConfirmed ? "Confirmado" : "Confirmar"}
                          </span>
                          <span className="inline sm:hidden">
                            {isConfirmed ? "OK" : "OK?"}
                          </span>
                        </Button>
                      </TableCell>
                      <TableCell className="sticky left-[80px] bg-background z-10 text-white">
                        <Badge
                          variant={isConfirmed ? "default" : "secondary"}
                          className={`${
                            isConfirmed
                              ? "bg-success/20 text-success border-success/30"
                              : ""
                          } text-xs px-1 py-0`}
                        >
                          {isConfirmed ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Confirmado
                            </>
                          ) : (
                            <>
                              <Clock className="h-3 w-3 mr-1" />
                              Pendiente
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      {orderedHeaders.map((header, colIndex) => (
                        <TableCell
                          key={header}
                          className={`max-w-[200px] truncate text-white px-2 py-2 sm:px-4 sm:py-2 ${
                            colIndex % 2 === 0
                              ? "bg-primary/10 text-white"
                              : "bg-accent/10 text-white"
                          }`}
                          style={{
                            fontSize: "1rem",
                            whiteSpace: "normal",
                            wordBreak: "break-word",
                          }}
                        >
                          {row[header]?.toString() || "-"}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
};
