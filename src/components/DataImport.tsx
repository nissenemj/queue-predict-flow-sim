
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import * as XLSX from 'xlsx';
import { Upload, FileText, AlertCircle, Calendar, TrendingUp } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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

const DataImport: React.FC<DataImportProps> = ({ onDataImported }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    
    if (!file) return;
    
    // Check file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError("Vain Excel-tiedostot (.xlsx tai .xls) ovat tuettuja");
      return;
    }
    
    setIsUploading(true);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Process the data
        const processedData = processImportedData(jsonData);
        onDataImported(processedData);
        toast.success(`Data ladattu onnistuneesti: ${processedData.data.length} riviä`);
      } catch (err) {
        console.error("Virhe tiedoston käsittelyssä:", err);
        setError("Virhe tiedoston käsittelyssä. Tarkista tiedostomuoto ja sisältö.");
      } finally {
        setIsUploading(false);
      }
    };
    
    reader.onerror = () => {
      setError("Tiedoston luku epäonnistui");
      setIsUploading(false);
    };
    
    reader.readAsBinaryString(file);
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Historiallinen data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          Lataa Excel-tiedosto, joka sisältää historiallista dataa potilaiden saapumisista ja odotusajoista.
          Tiedostossa tulisi olla sarakkeet: Päivämäärä, Saapuneet potilaat, Keskimääräinen odotusaika (päivissä).
        </p>
        
        <div className="grid gap-4">
          <div className="border border-dashed border-gray-300 rounded-md p-6 text-center">
            <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="mb-2 text-sm text-gray-600">Valitse Excel-tiedosto tai pudota tiedosto tähän</p>
            <input
              type="file"
              id="excel-upload"
              className="hidden"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById("excel-upload")?.click()}
              disabled={isUploading}
            >
              {isUploading ? "Ladataan..." : "Valitse tiedosto"}
            </Button>
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Virhe</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-800">
            <div className="flex flex-col gap-2">
              <p className="flex items-center gap-1">
                <Calendar className="h-4 w-4" /> Varmista että Excel-tiedostossasi on seuraavat sarakkeet:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Päivämäärä (muodossa YYYY-MM-DD)</li>
                <li>Saapuneet potilaat (lukumäärä)</li>
                <li>Keskimääräinen odotusaika (päivissä)</li>
              </ul>
              <p className="flex items-center gap-1 mt-1">
                <TrendingUp className="h-4 w-4" /> Järjestelmä luo automaattisesti ennusteen tulevasta potilasmäärästä.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Process the imported Excel data and generate a forecast
function processImportedData(jsonData: any[]): ImportResult {
  try {
    // Validate and convert the data
    const processedData: DataPoint[] = jsonData
      .filter(row => row.Päivämäärä && !isNaN(row['Saapuneet potilaat']) && !isNaN(row['Keskimääräinen odotusaika']))
      .map(row => ({
        date: parseExcelDate(row.Päivämäärä),
        arrivals: parseFloat(row['Saapuneet potilaat']),
        waitTime: parseFloat(row['Keskimääräinen odotusaika'])
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    
    if (processedData.length === 0) {
      throw new Error("Ei validia dataa tiedostossa");
    }
    
    // Calculate average arrivals per week
    // Group data by week and calculate weekly sums
    const weeklySums: { [key: string]: { arrivals: number, count: number } } = {};
    
    processedData.forEach(point => {
      // Get week number for the date
      const weekKey = getWeekNumber(point.date);
      
      if (!weeklySums[weekKey]) {
        weeklySums[weekKey] = { arrivals: 0, count: 0 };
      }
      
      weeklySums[weekKey].arrivals += point.arrivals;
      weeklySums[weekKey].count += 1;
    });
    
    // Calculate average weekly arrivals
    const weeklyArrivals = Object.values(weeklySums).map(week => week.arrivals);
    const avgArrivalsPerWeek = weeklyArrivals.reduce((sum, val) => sum + val, 0) / weeklyArrivals.length;
    
    // Calculate average wait time
    const avgWaitTime = processedData.reduce((sum, point) => sum + point.waitTime, 0) / processedData.length;
    
    // Generate a simple forecast for future weeks using moving average
    const forecast = generateForecast(processedData);
    
    return {
      data: processedData,
      avgArrivalsPerWeek,
      avgWaitTime,
      forecast
    };
  } catch (error) {
    console.error("Error processing data:", error);
    throw error;
  }
}

// Helper function to parse Excel dates
function parseExcelDate(dateValue: any): Date {
  // Try to handle different date formats
  if (typeof dateValue === 'string') {
    // Try ISO format YYYY-MM-DD
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) return date;
    
    // Try DD.MM.YYYY format
    const parts = dateValue.split('.');
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1; // JavaScript months are 0-indexed
      const year = parseInt(parts[2]);
      
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) return date;
    }
  } else if (typeof dateValue === 'number') {
    // Excel serial date format
    const excelEpoch = new Date(1899, 11, 31);
    const date = new Date(excelEpoch.getTime() + (dateValue * 24 * 60 * 60 * 1000));
    return date;
  }
  
  // Fallback
  return new Date();
}

// Helper function to get week number from a date
function getWeekNumber(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-${weekNumber}`;
}

// Generate a simple forecast using moving average
function generateForecast(data: DataPoint[]): DataPoint[] {
  if (data.length < 4) {
    // Not enough data for a good forecast
    return [];
  }
  
  // Group data by week
  const weeklyData: { [key: string]: { arrivals: number[], waitTimes: number[], date: Date } } = {};
  
  data.forEach(point => {
    const weekKey = getWeekNumber(point.date);
    
    if (!weeklyData[weekKey]) {
      weeklyData[weekKey] = { arrivals: [], waitTimes: [], date: new Date(point.date) };
    }
    
    weeklyData[weekKey].arrivals.push(point.arrivals);
    weeklyData[weekKey].waitTimes.push(point.waitTime);
  });
  
  // Convert to array sorted by date
  const weeklyDataArray = Object.values(weeklyData)
    .map(week => ({
      date: week.date,
      arrivals: week.arrivals.reduce((sum, val) => sum + val, 0),
      waitTime: week.waitTimes.reduce((sum, val) => sum + val, 0) / week.waitTimes.length
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  
  // Use moving average for forecasting next 10 weeks
  const forecast: DataPoint[] = [];
  const windowSize = 4; // Use last 4 weeks for moving average
  
  for (let i = 0; i < 10; i++) {
    // Get the last few weeks for the moving average calculation
    const lastWeeks = i === 0 
      ? weeklyDataArray.slice(-windowSize) 
      : [...weeklyDataArray.slice(-windowSize), ...forecast].slice(-windowSize);
    
    // Calculate averages
    const avgArrivals = lastWeeks.reduce((sum, week) => sum + week.arrivals, 0) / lastWeeks.length;
    const avgWaitTime = lastWeeks.reduce((sum, week) => sum + week.waitTime, 0) / lastWeeks.length;
    
    // Create forecast date (1 week after the last date)
    const lastDate = i === 0 ? weeklyDataArray[weeklyDataArray.length - 1].date : forecast[forecast.length - 1].date;
    const forecastDate = new Date(lastDate);
    forecastDate.setDate(forecastDate.getDate() + 7);
    
    forecast.push({
      date: forecastDate,
      arrivals: Math.round(avgArrivals),
      waitTime: avgWaitTime
    });
  }
  
  return forecast;
}

export default DataImport;
