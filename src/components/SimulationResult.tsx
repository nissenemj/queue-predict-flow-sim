
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

interface ResultMetrics {
  avgWaitTime: number;
  finalQueueLength: number;
  totalSurgeries: number;
}

interface SimulationResultProps {
  title: string;
  slotsPerWeek: number;
  results: ResultMetrics;
  comparisonResults?: ResultMetrics;
}

const SimulationResult: React.FC<SimulationResultProps> = ({ 
  title, 
  slotsPerWeek,
  results, 
  comparisonResults 
}) => {
  // Calculate the percentage change between the results and comparison results
  const calculateChange = (current: number, previous: number | undefined) => {
    if (!previous || previous === 0) return null;
    return ((current - previous) / previous) * 100;
  };
  
  // Format a percentage value
  const formatPercentage = (value: number | null) => {
    if (value === null) return '';
    return value > 0 ? `+${value.toFixed(1)}%` : `${value.toFixed(1)}%`;
  };
  
  // Get the change indicator component based on the value and whether lower is better
  const getChangeIndicator = (change: number | null, lowerIsBetter = true) => {
    if (change === null) return null;
    
    // For metrics where lower is better (wait time, queue length)
    if (lowerIsBetter) {
      if (change < 0) return <ArrowDown className="h-4 w-4 text-green-600" />;
      if (change > 0) return <ArrowUp className="h-4 w-4 text-red-600" />;
      return <Minus className="h-4 w-4 text-gray-500" />;
    } 
    // For metrics where higher is better (total surgeries)
    else {
      if (change > 0) return <ArrowUp className="h-4 w-4 text-green-600" />;
      if (change < 0) return <ArrowDown className="h-4 w-4 text-red-600" />;
      return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  // Calculate percentage changes
  const waitTimeChange = calculateChange(results.avgWaitTime, comparisonResults?.avgWaitTime);
  const queueLengthChange = calculateChange(results.finalQueueLength, comparisonResults?.finalQueueLength);
  const surgeriesChange = calculateChange(results.totalSurgeries, comparisonResults?.totalSurgeries);

  return (
    <Card>
      <CardContent className="pt-6">
        <h3 className="text-lg font-medium mb-2 flex items-center">
          {title}
          <span className="ml-1 text-sm font-normal text-gray-500">
            ({slotsPerWeek} paikkaa/vk)
          </span>
        </h3>
        
        <div className="space-y-4">
          <div>
            <div className="text-sm text-gray-500 mb-1">Keskimääräinen odotusaika</div>
            <div className="flex items-center">
              <span className="text-2xl font-semibold">{Math.round(results.avgWaitTime)}</span>
              <span className="ml-1 text-gray-500">päivää</span>
              
              {comparisonResults && (
                <div className="ml-auto flex items-center gap-1">
                  {getChangeIndicator(waitTimeChange)}
                  <span className={`text-sm ${waitTimeChange && waitTimeChange < 0 ? 'text-green-600' : waitTimeChange && waitTimeChange > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                    {formatPercentage(waitTimeChange)}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <div className="text-sm text-gray-500 mb-1">Jonon pituus simulaation lopussa</div>
            <div className="flex items-center">
              <span className="text-2xl font-semibold">{results.finalQueueLength}</span>
              <span className="ml-1 text-gray-500">potilasta</span>
              
              {comparisonResults && (
                <div className="ml-auto flex items-center gap-1">
                  {getChangeIndicator(queueLengthChange)}
                  <span className={`text-sm ${queueLengthChange && queueLengthChange < 0 ? 'text-green-600' : queueLengthChange && queueLengthChange > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                    {formatPercentage(queueLengthChange)}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <div className="text-sm text-gray-500 mb-1">Leikkauksia tehty yhteensä</div>
            <div className="flex items-center">
              <span className="text-2xl font-semibold">{results.totalSurgeries}</span>
              <span className="ml-1 text-gray-500">kpl</span>
              
              {comparisonResults && (
                <div className="ml-auto flex items-center gap-1">
                  {getChangeIndicator(surgeriesChange, false)}
                  <span className={`text-sm ${surgeriesChange && surgeriesChange > 0 ? 'text-green-600' : surgeriesChange && surgeriesChange < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                    {formatPercentage(surgeriesChange)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SimulationResult;
