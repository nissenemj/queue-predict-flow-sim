
import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/components/ui/sonner";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ChevronDown, ChevronUp, InfoIcon, BarChart, Download, FileText, Table } from "lucide-react";
import QueueSimulator from '@/components/QueueSimulator';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const Index = () => {
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isFormatInfoOpen, setIsFormatInfoOpen] = useState(false);
  
  // Function to download a template Excel file for users
  const downloadTemplate = () => {
    try {
      // Create a new workbook
      const wb = XLSX.utils.book_new();
      
      // Create sample data for the template
      const templateData = [
        ["Päivämäärä", "Saapuneet potilaat", "Keskimääräinen odotusaika"],
        ["2025-01-01", 12, 45],
        ["2025-01-08", 14, 47],
        ["2025-01-15", 13, 48],
        ["2025-01-22", 15, 52],
        ["2025-01-29", 16, 55],
        ["2025-02-05", 14, 58],
        ["2025-02-12", 15, 60],
        ["", "", ""],
        ["Huom! Korvaa yllä olevat esimerkkiarvot todellisilla tiedoilla.", "", ""],
        ["- Päivämäärä: Käytä muotoa YYYY-MM-DD", "", ""],
        ["- Saapuneet potilaat: Jonoon lisättyjen potilaiden määrä kyseisellä viikolla", "", ""],
        ["- Keskimääräinen odotusaika: Odotusaika päivissä", "", ""]
      ];
      
      // Convert data to worksheet
      const ws = XLSX.utils.aoa_to_sheet(templateData);
      
      // Format date cells
      for (let i = 1; i <= 7; i++) {
        const cellRef = XLSX.utils.encode_cell({r: i, c: 0});
        if (ws[cellRef]) {
          ws[cellRef].t = 'd'; // Set type as date
        }
      }
      
      // Add the worksheet to the workbook
      XLSX.utils.book_append_sheet(wb, ws, "Historiatiedot");
      
      // Generate Excel file
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
      
      // Convert to blob
      function s2ab(s: string) {
        const buf = new ArrayBuffer(s.length);
        const view = new Uint8Array(buf);
        for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF;
        return buf;
      }
      
      const blob = new Blob([s2ab(wbout)], { type: "application/octet-stream" });
      saveAs(blob, "leikkausjono_data_pohja.xlsx");
      
      toast.success("Lomakepohja ladattu");
    } catch (error) {
      console.error("Error generating template:", error);
      toast.error("Virhe lomakepohjan luonnissa");
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Leikkausjonon Simulaattori</h1>
          <p className="text-gray-600 max-w-3xl">
            Simuloi leikkausjonon kehitystä ja testaa resurssimuutosten vaikutusta jonon pituuteen ja odotusaikoihin.
          </p>
          
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <Button 
              variant="outline" 
              onClick={downloadTemplate}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              <Download className="h-4 w-4" />
              Lataa Excel-lomakepohja
            </Button>
            
            <Collapsible
              open={isFormatInfoOpen}
              onOpenChange={setIsFormatInfoOpen}
              className="bg-white rounded-lg border shadow-sm"
            >
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full flex justify-between p-4 h-auto">
                  <div className="flex items-center">
                    <Table className="h-5 w-5 mr-2 text-blue-600" />
                    <span className="font-medium">Excel-tiedoston muoto</span>
                  </div>
                  {isFormatInfoOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="p-4 pt-0 text-sm text-gray-600 space-y-2">
                <p>
                  Excel-tiedoston tulee sisältää seuraavat sarakkeet ja tiedot:
                </p>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse border border-gray-300 mt-2">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-4 py-2">Sarake</th>
                        <th className="border border-gray-300 px-4 py-2">Tieto</th>
                        <th className="border border-gray-300 px-4 py-2">Muoto</th>
                        <th className="border border-gray-300 px-4 py-2">Esimerkki</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 px-4 py-2">A</td>
                        <td className="border border-gray-300 px-4 py-2">Päivämäärä</td>
                        <td className="border border-gray-300 px-4 py-2">YYYY-MM-DD</td>
                        <td className="border border-gray-300 px-4 py-2">2025-01-01</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-4 py-2">B</td>
                        <td className="border border-gray-300 px-4 py-2">Saapuneet potilaat</td>
                        <td className="border border-gray-300 px-4 py-2">Numero</td>
                        <td className="border border-gray-300 px-4 py-2">12</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-4 py-2">C</td>
                        <td className="border border-gray-300 px-4 py-2">Keskimääräinen odotusaika</td>
                        <td className="border border-gray-300 px-4 py-2">Numero (päivinä)</td>
                        <td className="border border-gray-300 px-4 py-2">45</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="mt-2">
                  <strong>Huomioitavaa:</strong>
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Ensimmäisellä rivillä tulee olla sarakeotsikot</li>
                  <li>Päivämäärien tulee olla aikajärjestyksessä (viikoittain tai kuukausittain)</li>
                  <li>Saapuneet potilaat = Jonoon lisättyjen potilaiden määrä kyseisellä aikavälillä</li>
                  <li>Odotusaika = Keskimääräinen odotusaika päivissä kyseisellä aikavälillä</li>
                  <li>Voit ladata valmiin lomakepohjan yllä olevasta napista</li>
                </ul>
              </CollapsibleContent>
            </Collapsible>

            <Collapsible
              open={isInfoOpen}
              onOpenChange={setIsInfoOpen}
              className="bg-white rounded-lg border shadow-sm"
            >
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full flex justify-between p-4 h-auto">
                  <div className="flex items-center">
                    <InfoIcon className="h-5 w-5 mr-2 text-blue-600" />
                    <span className="font-medium">Tietoja simulaattorista</span>
                  </div>
                  {isInfoOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="p-4 pt-0 text-sm text-gray-600 space-y-2">
                <p>
                  Tämä simulaattori mallintaa yksinkertaistetulla tavalla yhden erikoisalan tai toimenpidetyypin jonotilannetta. 
                  Simulaatio perustuu diskreetin tapahtumasimuloinnin periaatteisiin ja laskee:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Jonon kehityksen ajan myötä</li>
                  <li>Keskimääräisen odotusajan leikkaukseen</li>
                  <li>Suoritettujen leikkausten määrän</li>
                  <li>Vertailun perustilanteen ja intervention välillä</li>
                </ul>
                <p>
                  Voit tuoda simulaattoriin historiallista dataa Excel-tiedostosta ja hyödyntää sitä tulevien potilasmäärien ennustamiseen.
                  Lataa lomakepohja, täytä siihen historiatiedot, ja lataa se simulaattoriin "Historiatiedot"-välilehdellä.
                </p>
                <p>
                  Simulaatiossa oletetaan FIFO-jonotus (First In, First Out), eli potilaat hoidetaan saapumisjärjestyksessä.
                  Malli ei huomioi peruutuksia tai kausittaista vaihtelua potilaiden saapumisessa, ellei se ilmene historiadatasta.
                </p>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </header>
        
        <main>
          <QueueSimulator />
        </main>
        
        <footer className="mt-12 text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} Leikkausjonon Simulaattori MVP</p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
