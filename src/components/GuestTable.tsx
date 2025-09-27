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
  const [openRow, setOpenRow] = useState<number | null>(null);
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
            desiredOrder.includes(h.trim().toLowerCase()))
        ) {
          orderedHeaders.push(h);
        }
      });
    });

    // 3. Agregar el resto de los headers que no coinciden
    headers.forEach((h) => {
      if (!orderedHeaders.includes(h)) {
        orderedHeaders.push(h);
      }
    });

    return orderedHeaders;
  };

  return (
    <Card className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4">
        {/* Search and actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Input
            placeholder="Buscar invitado..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="max-w-sm flex-1"
          />
          <Button
            onClick={() => {}}
            variant="default"
            className="whitespace-nowrap"
          >
            <UserCheck className="h-4 w-4 mr-2" />
            Sin confirmar{" "}
            {
              filteredData.filter(
                (row) => !confirmedGuests.has(getGuestId(row, 0))
              ).length
            }
          </Button>
        </div>

        {/* Guests table */}
        <Table>
          <TableHeader>
            <TableRow className="hidden sm:table-row border-b border-gray-700">
              <TableHead className="min-w-[50px] text-center hidden sm:table-cell border-r border-gray-700 bg-background">
                N°
              </TableHead>
              <TableHead className="min-w-[120px] text-left border-r border-gray-700 bg-background">
                Acciones
              </TableHead>
              <TableHead className="min-w-[120px] text-left border-r border-gray-700 bg-background">
                Estado
              </TableHead>
              {getOrderedHeaders(headers).map((header) => (
                <TableHead
                  key={header}
                  className="min-w-[140px] text-left border-r border-gray-700 bg-background"
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
                <React.Fragment key={index}>
                  {/* Desktop row */}
                  <TableRow
                    className={
                      "hidden sm:table-row border-b border-gray-700 " +
                      (isConfirmed ? "bg-success/10 " : "") +
                      " text-white text-xs sm:text-base"
                    }
                  >
                    {/* Número de orden solo en desktop */}
                    <TableCell className="text-center font-bold hidden sm:table-cell border-r border-gray-700">
                      {index + 1}
                    </TableCell>
                    <TableCell className="bg-background z-10 text-white border-r border-gray-700">
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
                    <TableCell className="bg-background z-10 text-white border-r border-gray-700">
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
                        className="min-w-[140px] text-white px-2 py-2 sm:px-4 sm:py-2 border-r border-gray-700"
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

                  {/* Mobile row as accordion */}
                  <TableRow
                    className={
                      "sm:hidden cursor-pointer " +
                      (isConfirmed ? "bg-success/10 " : "") +
                      " text-white"
                    }
                    onClick={() => setOpenRow(openRow === index ? null : index)}
                  >
                    <TableCell
                      colSpan={2 + orderedHeaders.length}
                      className="p-0"
                    >
                      <div className="flex flex-col">
                        {/* Header: solo nombre o id, sin orden */}
                        <div className="flex items-center justify-between px-3 py-2">
                          <span className="font-bold text-base">
                            {row["Nombre"] ||
                              row["Apellido y Nombre"] ||
                              guestId}
                          </span>
                          <span>{openRow === index ? "▲" : "▼"}</span>
                        </div>
                        {/* Confirm button and status */}
                        <div className="flex items-center gap-2 mb-2 px-3">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConfirmGuest(guestId);
                            }}
                            variant={isConfirmed ? "default" : "outline"}
                            size="sm"
                            className={`${
                              isConfirmed
                                ? "bg-success hover:bg-success/90"
                                : ""
                            } px-2 py-1 h-auto text-xs`}
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            {isConfirmed ? "Confirmado" : "Confirmar"}
                          </Button>
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
                        </div>
                        {/* Accordion content */}
                        {openRow === index && (
                          <div className="bg-background/80 px-3 pb-3 rounded-b">
                            <div className="grid grid-cols-1 gap-1">
                              {orderedHeaders.map((header) => (
                                <div key={header} className="flex text-xs py-1">
                                  <span className="font-semibold min-w-[110px] text-orange-400">
                                    {header}:
                                  </span>
                                  <span className="ml-2 break-words text-white">
                                    {row[header]?.toString() || "-"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};
