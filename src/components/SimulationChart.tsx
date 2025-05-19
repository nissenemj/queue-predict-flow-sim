
import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

interface SimulationData {
  baselineResults: {
    weeklyQueueLengths: number[];
    weeklySurgeries: number[];
  };
  interventionResults: {
    weeklyQueueLengths: number[];
    weeklySurgeries: number[];
  };
}

interface SimulationChartProps {
  chartType: 'queue' | 'surgeries' | 'cumulative';
  simulationResults: SimulationData;
  duration: number;
}

const SimulationChart: React.FC<SimulationChartProps> = ({ 
  chartType, 
  simulationResults, 
  duration 
}) => {
  // Prepare the data for the chart based on the chart type
  const prepareData = () => {
    const data = [];
    
    if (chartType === 'queue') {
      // Chart showing queue length over time
      for (let i = 0; i < simulationResults.baselineResults.weeklyQueueLengths.length; i++) {
        data.push({
          week: i,
          baseline: simulationResults.baselineResults.weeklyQueueLengths[i],
          intervention: simulationResults.interventionResults.weeklyQueueLengths[i]
        });
      }
    } 
    else if (chartType === 'surgeries') {
      // Chart showing weekly surgeries
      for (let i = 0; i < simulationResults.baselineResults.weeklySurgeries.length; i++) {
        data.push({
          week: i + 1, // Week 1, 2, 3...
          baseline: simulationResults.baselineResults.weeklySurgeries[i],
          intervention: simulationResults.interventionResults.weeklySurgeries[i]
        });
      }
    }
    else if (chartType === 'cumulative') {
      // Chart showing cumulative surgeries over time
      let baselineCumulative = 0;
      let interventionCumulative = 0;
      
      for (let i = 0; i < simulationResults.baselineResults.weeklySurgeries.length; i++) {
        baselineCumulative += simulationResults.baselineResults.weeklySurgeries[i];
        interventionCumulative += simulationResults.interventionResults.weeklySurgeries[i];
        
        data.push({
          week: i + 1, // Week 1, 2, 3...
          baseline: baselineCumulative,
          intervention: interventionCumulative
        });
      }
    }
    
    return data;
  };
  
  const chartData = prepareData();
  
  // Set chart title and y-axis label based on chart type
  const getChartTitle = () => {
    switch (chartType) {
      case 'queue':
        return 'Jonon pituuden kehitys';
      case 'surgeries':
        return 'Leikkauksia viikossa';
      case 'cumulative':
        return 'Kumulatiiviset leikkaukset';
      default:
        return '';
    }
  };
  
  const getYAxisLabel = () => {
    switch (chartType) {
      case 'queue':
        return 'Jonon pituus (potilaita)';
      case 'surgeries':
        return 'Leikkauksia / viikko';
      case 'cumulative':
        return 'Leikkausten kokonaismäärä';
      default:
        return '';
    }
  };
  
  return (
    <div>
      <h3 className="text-lg font-medium mb-4">{getChartTitle()}</h3>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="week" 
              label={{ 
                value: 'Viikko', 
                position: 'insideBottom', 
                offset: -5 
              }} 
            />
            <YAxis 
              label={{ 
                value: getYAxisLabel(), 
                angle: -90, 
                position: 'insideLeft' 
              }} 
            />
            <Tooltip />
            <Legend />
            <Line
              name="Perustilanne"
              type="monotone"
              dataKey="baseline"
              stroke="#2563eb"
              activeDot={{ r: 8 }}
              strokeWidth={2}
            />
            <Line
              name="Interventio"
              type="monotone"
              dataKey="intervention"
              stroke="#dc2626"
              activeDot={{ r: 8 }}
              strokeWidth={2}
              strokeDasharray="5 5"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SimulationChart;
