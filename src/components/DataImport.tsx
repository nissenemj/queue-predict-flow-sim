
import React, { useState, useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { Upload } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as XLSX from 'xlsx';

interface DataPoint {
  date: Date;
  arrivals: number;
  waitTime: number;
}

interface ImportResult {
  data: DataPoint[];
  avgArrivalsPerWeek: number;
  avgWaitTime: number;
  forecast: DataPoint[];
}

interface DataImportProps {
  onDataImported: (result: ImportResult) => void;
}

const DataImport = ({ onDataImported }: DataImportProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState("upload");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const processFile = async () => {
    if (!file) {
      toast.error("Valitse ensin tiedosto");
      return;
    }

    setUploading(true);

    try {
      // Read the Excel file
      const data = await readExcelFile(file);
      
      // Process the data
      if (data && data.length > 0) {
        // Extract data points
        const dataPoints: DataPoint[] = [];
        
        // Skip header row
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          // Check if row has valid date and numeric values
          if (row[0] && !isNaN(Number(row[1])) && !isNaN(Number(row[2]))) {
            const date = new Date(row[0]);
            const arrivals = Number(row[1]);
            const waitTime = Number(row[2]);
            
            if (!isNaN(date.getTime())) {
              dataPoints.push({
                date,
                arrivals,
                waitTime
              });
            }
          }
        }
        
        if (dataPoints.length === 0) {
          throw new Error("Ei validia dataa tiedostossa");
        }
        
        // Calculate average arrivals per week
        const totalArrivals = dataPoints.reduce((sum, point) => sum + point.arrivals, 0);
        const avgArrivalsPerWeek = totalArrivals / dataPoints.length;
        
        // Calculate average wait time
        const totalWaitTime = dataPoints.reduce((sum, point) => sum + point.waitTime, 0);
        const avgWaitTime = totalWaitTime / dataPoints.length;
        
        // Create simple forecasts for the next 10 weeks
        const forecast: DataPoint[] = [];
        const lastDate = new Date(dataPoints[dataPoints.length - 1].date);
        
        // Use moving average for forecasting
        const movingAvgWindow = Math.min(4, dataPoints.length);
        const recentArrivals = dataPoints.slice(-movingAvgWindow).map(p => p.arrivals);
        const recentAvg = recentArrivals.reduce((sum, val) => sum + val, 0) / movingAvgWindow;
        
        for (let i = 1; i <= 10; i++) {
          const forecastDate = new Date(lastDate);
          forecastDate.setDate(forecastDate.getDate() + (7 * i)); // Add i weeks
          
          // Apply slight random variation around the moving average
          const variation = (Math.random() - 0.5) * 0.2; // +/- 10% variation
          const forecastArrivals = Math.round(recentAvg * (1 + variation));
          
          forecast.push({
            date: forecastDate,
            arrivals: forecastArrivals,
            waitTime: avgWaitTime // Use average wait time for forecasts
          });
        }
        
        // Create result object
        const result: ImportResult = {
          data: dataPoints,
          avgArrivalsPerWeek,
          avgWaitTime,
          forecast
        };
        
        // Call the callback with processed data
        onDataImported(result);
        toast.success(`${dataPoints.length} datapisteen tuonti onnistui`);
        
        // Reset file input
        setFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } else {
        throw new Error("Tiedosto ei sisällä dataa");
      }
    } catch (error) {
      console.error("Error processing file:", error);
      toast.error("Virhe tiedoston käsittelyssä: " + (error instanceof Error ? error.message : "Tuntematon virhe"));
    } finally {
      setUploading(false);
    }
  };

  const readExcelFile = (file: File): Promise<any[][]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = (error) => {
        reject(error);
      };
      
      reader.readAsBinaryString(file);
    });
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload">Lataa Excel</TabsTrigger>
          <TabsTrigger value="manual">Syötä manuaalisesti</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upload" className="space-y-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="flex-1"
              />
              <Button 
                onClick={processFile} 
                disabled={!file || uploading}
                size="sm"
              >
                <Upload className="h-4 w-4 mr-1" />
                {uploading ? "Käsitellään..." : "Lataa"}
              </Button>
            </div>
            <p className="text-sm text-gray-500">
              Lataa Excel-tiedosto, jossa on historiadataa potilaiden saapumisista ja odotusajoista.
              Tiedostossa tulisi olla sarakkeet: Päivämäärä, Saapuneet potilaat, Odotusaika.
            </p>
          </div>
        </TabsContent>
        
        <TabsContent value="manual" className="space-y-4">
          <p className="text-sm text-gray-500">
            Tämä ominaisuus ei ole vielä saatavilla. 
            Ole hyvä ja käytä Excel-tiedoston latausta tietojen tuomiseksi.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DataImport;
