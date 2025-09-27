import React, { useState } from 'react';
import { Bike, Users, Database } from 'lucide-react';
import { CSVUploader } from '@/components/CSVUploader';
import { GuestTable } from '@/components/GuestTable';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import motoLogo from '@/assets/moto-logo.png';
import motoEventHero from '@/assets/moto-event-hero.jpg';

const Index = () => {
  const [guestData, setGuestData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const handleDataLoad = (data: any[], csvHeaders: string[]) => {
    setGuestData(data);
    setHeaders(csvHeaders);
    setSearchTerm(''); // Reset search when new data is loaded
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border overflow-hidden">
        <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between">
            <div className="flex items-center w-full relative mb-2 sm:mb-0">
              <div className="w-full h-12 sm:h-16 relative">
                <img 
                  src="/moto-animation.svg" 
                  alt="Moto Event" 
                  className="absolute top-0 w-full h-full"
                />
              </div>
              <div className="absolute left-1/2 transform -translate-x-1/2 text-center">
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Validación de Invitados
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground">Sistema de gestión para eventos de motos</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Creado por <a 
                    className="font-bold bg-gradient-to-t from-blue-400 to-blue-700 bg-clip-text text-transparent" 
                    href="https://npmdesign.netlify.app/"
                  >
                    NPM
                  </a></p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        {guestData.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="card-moto">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Invitados</p>
                  <p className="text-2xl font-bold text-primary">{guestData.length}</p>
                </div>
                <Users className="h-8 w-8 text-primary" />
              </div>
            </Card>
            <Card className="card-moto">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Campos Detectados</p>
                  <p className="text-2xl font-bold text-accent">{headers.length}</p>
                </div>
                <Database className="h-8 w-8 text-accent" />
              </div>
            </Card>
            <Card className="card-moto">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Modo</p>
                  <p className="text-lg font-semibold text-success">Tiempo Real</p>
                </div>
                <Bike className="h-8 w-8 text-success" />
              </div>
            </Card>
          </div>
        )}

        {/* Event Hero Image Section */}
        {!guestData.length && (
          <Card className="card-moto overflow-hidden relative">
            <div className="relative h-64 md:h-80">
              <img 
                src={motoEventHero} 
                alt="Evento de Motos" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                  Bienvenido al Sistema de Validación
                </h2>
                <p className="text-muted-foreground">
                  Carga tu archivo CSV o Excel para comenzar la validación de invitados
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* CSV Upload Section */}
        <CSVUploader onDataLoad={handleDataLoad} />

        {/* Guest Table Section */}
        <GuestTable 
          data={guestData}
          headers={headers}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />

        {/* Database Preparation Info */}
        {guestData.length > 0 && (
          <Card className="card-moto border-dashed border-accent/50">
            <div className="flex items-start space-x-4">
              <div className="p-2 bg-accent/10 rounded-lg">
                <Database className="h-5 w-5 text-accent" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-accent mb-2">
                  Preparado para Base de Datos
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  El sistema está listo para conectar con Supabase para gestión en tiempo real:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Sincronización automática de confirmaciones</li>
                  <li>• Historial de validaciones</li>
                  <li>• Gestión multi-dispositivo</li>
                  <li>• Respaldo de datos en la nube</li>
                </ul>
              </div>
            </div>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-12">
        <div className="container mx-auto px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            Sistema de Validación de Invitados - Evento de Motos 2025 - NPM
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;