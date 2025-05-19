import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { toast } from "@/components/ui/sonner";
import { Separator } from "@/components/ui/separator";
import { BarChart } from "lucide-react";
import SimulationChart from './SimulationChart';
import SimulationResult from './SimulationResult';

// Define the simulation parameter types
interface SimulationParams {
  avgArrivalsPerWeek: number;
  slotsPerWeek: number;
  initialQueueSize: number;
  interventionSlots: number;
  simulationDurationWeeks: number;
}

// Define the simulation results type
interface SimulationResults {
  baselineResults: {
    avgWaitTime: number;
    finalQueueLength: number;
    totalSurgeries: number;
    weeklyQueueLengths: number[];
    weeklySurgeries: number[];
  };
  interventionResults: {
    avgWaitTime: number;
    finalQueueLength: number;
    totalSurgeries: number;
    weeklyQueueLengths: number[];
    weeklySurgeries: number[];
  };
}

const QueueSimulator = () => {
  // Default simulation parameters
  const [params, setParams] = useState<SimulationParams>({
    avgArrivalsPerWeek: 15,
    slotsPerWeek: 12,
    initialQueueSize: 150,
    interventionSlots: 14, // Default to slots + 2
    simulationDurationWeeks: 26,
  });

  const [interventionType, setInterventionType] = useState<'add' | 'change'>('add');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResults, setSimulationResults] = useState<SimulationResults | null>(null);
  const [activeResultTab, setActiveResultTab] = useState("queue");

  // Update a param value
  const updateParam = (param: keyof SimulationParams, value: number) => {
    setParams(prevParams => ({ ...prevParams, [param]: value }));
    
    // If we're in "add slots" mode, update interventionSlots automatically
    if (param === 'slotsPerWeek' && interventionType === 'add') {
      const addedSlots = Math.max(params.interventionSlots - params.slotsPerWeek, 0);
      setParams(prevParams => ({ ...prevParams, interventionSlots: value + addedSlots }));
    }
  };

  // Handle intervention type change
  const handleInterventionTypeChange = (value: 'add' | 'change') => {
    setInterventionType(value);
    
    if (value === 'add') {
      // When switching to "add" mode, recalculate interventionSlots as current slots + added slots
      const addedSlots = 2; // Default added slots
      setParams(prevParams => ({ ...prevParams, interventionSlots: prevParams.slotsPerWeek + addedSlots }));
    }
  };

  // Handle intervention slots change based on intervention type
  const handleInterventionSlotsChange = (value: number) => {
    if (interventionType === 'add') {
      // In "add" mode, value represents the added slots
      setParams(prevParams => ({ ...prevParams, interventionSlots: prevParams.slotsPerWeek + value }));
    } else {
      // In "change" mode, value is the absolute number of slots
      setParams(prevParams => ({ ...prevParams, interventionSlots: value }));
    }
  };

  // Run the simulation
  const runSimulation = () => {
    setIsSimulating(true);
    toast.info("Simulaation suorittaminen aloitettu...");

    // Create mock simulation data
    // In a real implementation, this would call a backend API or use WebWorker to run the simulation
    setTimeout(() => {
      const weeklyData = generateMockSimulationData();
      setSimulationResults(weeklyData);
      setIsSimulating(false);
      toast.success("Simulaatio suoritettu onnistuneesti!");
    }, 1500);
  };

  // Mock data generation - this would be replaced by actual simulation results
  const generateMockSimulationData = (): SimulationResults => {
    const weeks = params.simulationDurationWeeks;
    const baselineQueue = [params.initialQueueSize];
    const interventionQueue = [params.initialQueueSize];
    const baselineSurgeries = [];
    const interventionSurgeries = [];

    // Generate queue lengths for each week
    for (let i = 1; i < weeks; i++) {
      // Baseline: new arrivals minus surgeries performed
      const baselineSurgeriesPossible = Math.min(baselineQueue[i-1], params.slotsPerWeek);
      baselineSurgeries.push(baselineSurgeriesPossible);
      const baselineNewQueue = baselineQueue[i-1] + params.avgArrivalsPerWeek - baselineSurgeriesPossible;
      baselineQueue.push(Math.max(0, baselineNewQueue));

      // Intervention: new arrivals minus surgeries performed with increased capacity
      const interventionSurgeriesPossible = Math.min(interventionQueue[i-1], params.interventionSlots);
      interventionSurgeries.push(interventionSurgeriesPossible);
      const interventionNewQueue = interventionQueue[i-1] + params.avgArrivalsPerWeek - interventionSurgeriesPossible;
      interventionQueue.push(Math.max(0, interventionNewQueue));
    }

    // Add the last week's surgeries
    const lastBaselineSurgeries = Math.min(baselineQueue[weeks-1], params.slotsPerWeek);
    const lastInterventionSurgeries = Math.min(interventionQueue[weeks-1], params.interventionSlots);
    baselineSurgeries.push(lastBaselineSurgeries);
    interventionSurgeries.push(lastInterventionSurgeries);

    // Calculate average wait time (simplified for mock data)
    // In reality this should come from the actual simulation
    let baselineWaitTime = params.initialQueueSize > 0 ? 
      params.initialQueueSize / (params.slotsPerWeek / 7) : 0;
    
    if (params.avgArrivalsPerWeek > params.slotsPerWeek) {
      baselineWaitTime *= 1.5; // Queue is growing, so wait times increase
    }

    let interventionWaitTime = params.initialQueueSize > 0 ? 
      params.initialQueueSize / (params.interventionSlots / 7) : 0;
    
    if (params.avgArrivalsPerWeek > params.interventionSlots) {
      interventionWaitTime *= 1.5; // Queue is growing, so wait times increase
    }

    // Calculate total surgeries
    const totalBaselineSurgeries = baselineSurgeries.reduce((a, b) => a + b, 0);
    const totalInterventionSurgeries = interventionSurgeries.reduce((a, b) => a + b, 0);

    return {
      baselineResults: {
        avgWaitTime: Math.min(baselineWaitTime, params.simulationDurationWeeks * 7), // Cap at simulation duration
        finalQueueLength: baselineQueue[baselineQueue.length - 1],
        totalSurgeries: totalBaselineSurgeries,
        weeklyQueueLengths: baselineQueue,
        weeklySurgeries: baselineSurgeries
      },
      interventionResults: {
        avgWaitTime: Math.min(interventionWaitTime, params.simulationDurationWeeks * 7), // Cap at simulation duration
        finalQueueLength: interventionQueue[interventionQueue.length - 1],
        totalSurgeries: totalInterventionSurgeries,
        weeklyQueueLengths: interventionQueue,
        weeklySurgeries: interventionSurgeries
      }
    };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Input Panel */}
      <Card className="lg:col-span-1 shadow-sm">
        <CardHeader>
          <CardTitle>Simulaation parametrit</CardTitle>
          <CardDescription>Syötä simulaation lähtöarvot</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="avgArrivalsPerWeek">Uudet potilaat per viikko</Label>
              <div className="flex items-center space-x-2">
                <Input 
                  id="avgArrivalsPerWeek"
                  type="number" 
                  value={params.avgArrivalsPerWeek}
                  min={1}
                  onChange={(e) => updateParam('avgArrivalsPerWeek', parseInt(e.target.value))}
                  className="w-20"
                />
                <Slider 
                  id="avgArrivalsPerWeekSlider"
                  value={[params.avgArrivalsPerWeek]} 
                  min={1} 
                  max={50}
                  step={1}
                  onValueChange={(value) => updateParam('avgArrivalsPerWeek', value[0])}
                  className="flex-grow"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="slotsPerWeek">Leikkauspaikat per viikko</Label>
              <div className="flex items-center space-x-2">
                <Input 
                  id="slotsPerWeek"
                  type="number" 
                  value={params.slotsPerWeek}
                  min={1}
                  onChange={(e) => updateParam('slotsPerWeek', parseInt(e.target.value))}
                  className="w-20"
                />
                <Slider 
                  id="slotsPerWeekSlider"
                  value={[params.slotsPerWeek]} 
                  min={1} 
                  max={50}
                  step={1}
                  onValueChange={(value) => updateParam('slotsPerWeek', value[0])}
                  className="flex-grow"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="initialQueueSize">Jonon pituus alussa</Label>
              <div className="flex items-center space-x-2">
                <Input 
                  id="initialQueueSize"
                  type="number" 
                  value={params.initialQueueSize}
                  min={0}
                  onChange={(e) => updateParam('initialQueueSize', parseInt(e.target.value))}
                  className="w-20"
                />
                <Slider 
                  id="initialQueueSizeSlider"
                  value={[params.initialQueueSize]} 
                  min={0} 
                  max={500}
                  step={10}
                  onValueChange={(value) => updateParam('initialQueueSize', value[0])}
                  className="flex-grow"
                />
              </div>
            </div>

            <Separator />

            <div>
              <Label className="block mb-2">Intervention tyyppi</Label>
              <RadioGroup 
                value={interventionType} 
                onValueChange={(value) => handleInterventionTypeChange(value as 'add' | 'change')}
                className="flex space-x-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="add" id="add" />
                  <Label htmlFor="add">Lisää paikkoja</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="change" id="change" />
                  <Label htmlFor="change">Aseta paikkojen määrä</Label>
                </div>
              </RadioGroup>
            </div>

            {interventionType === 'add' ? (
              <div>
                <Label htmlFor="addedSlots">Lisättävät leikkauspaikat</Label>
                <div className="flex items-center space-x-2">
                  <Input 
                    id="addedSlots"
                    type="number" 
                    value={params.interventionSlots - params.slotsPerWeek}
                    min={1}
                    onChange={(e) => handleInterventionSlotsChange(parseInt(e.target.value))}
                    className="w-20"
                  />
                  <Slider 
                    id="addedSlotsSlider"
                    value={[params.interventionSlots - params.slotsPerWeek]} 
                    min={1} 
                    max={20}
                    step={1}
                    onValueChange={(value) => handleInterventionSlotsChange(value[0])}
                    className="flex-grow"
                  />
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Intervention jälkeen: {params.interventionSlots} paikkaa
                </div>
              </div>
            ) : (
              <div>
                <Label htmlFor="interventionSlots">Leikkauspaikat intervention jälkeen</Label>
                <div className="flex items-center space-x-2">
                  <Input 
                    id="interventionSlots"
                    type="number" 
                    value={params.interventionSlots}
                    min={1}
                    onChange={(e) => updateParam('interventionSlots', parseInt(e.target.value))}
                    className="w-20"
                  />
                  <Slider 
                    id="interventionSlotsSlider"
                    value={[params.interventionSlots]} 
                    min={1} 
                    max={50}
                    step={1}
                    onValueChange={(value) => updateParam('interventionSlots', value[0])}
                    className="flex-grow"
                  />
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Muutos: {params.interventionSlots - params.slotsPerWeek > 0 ? '+' : ''}
                  {params.interventionSlots - params.slotsPerWeek} paikkaa
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="simulationDurationWeeks">Simulaation kesto viikkoina</Label>
              <div className="flex items-center space-x-2">
                <Input 
                  id="simulationDurationWeeks"
                  type="number" 
                  value={params.simulationDurationWeeks}
                  min={4}
                  max={104}
                  onChange={(e) => updateParam('simulationDurationWeeks', parseInt(e.target.value))}
                  className="w-20"
                />
                <Slider 
                  id="simulationDurationWeeksSlider"
                  value={[params.simulationDurationWeeks]} 
                  min={4} 
                  max={104}
                  step={4}
                  onValueChange={(value) => updateParam('simulationDurationWeeks', value[0])}
                  className="flex-grow"
                />
              </div>
              <div className="text-sm text-gray-500 mt-1">
                ({Math.round(params.simulationDurationWeeks / 4)} kuukautta)
              </div>
            </div>

          </div>
          
          <div className="pt-2">
            <Button 
              onClick={runSimulation} 
              className="w-full"
              disabled={isSimulating}
            >
              {isSimulating ? "Simuloidaan..." : "Suorita simulaatio"}
            </Button>
          </div>
          
          <div className="rounded-md bg-blue-50 p-3">
            <div className="flex">
              <div className="text-blue-800">
                {params.avgArrivalsPerWeek > params.slotsPerWeek ? (
                  <p>⚠️ Nykyisillä resursseilla ({params.slotsPerWeek} paikkaa/vk) ei pystytä hoitamaan kaikkia uusia potilaita ({params.avgArrivalsPerWeek}/vk).</p>
                ) : params.avgArrivalsPerWeek === params.slotsPerWeek ? (
                  <p>ℹ️ Nykyiset resurssit ({params.slotsPerWeek} paikkaa/vk) riittävät juuri uusien potilaiden hoitamiseen ({params.avgArrivalsPerWeek}/vk).</p>
                ) : (
                  <p>✅ Nykyiset resurssit ({params.slotsPerWeek} paikkaa/vk) riittävät kaikkien uusien potilaiden ({params.avgArrivalsPerWeek}/vk) hoitamiseen.</p>
                )}
                
                {params.avgArrivalsPerWeek > params.interventionSlots ? (
                  <p className="mt-2">⚠️ Interventionkaan jälkeen ({params.interventionSlots} paikkaa/vk) ei pystytä hoitamaan kaikkia uusia potilaita.</p>
                ) : params.avgArrivalsPerWeek === params.interventionSlots ? (
                  <p className="mt-2">ℹ️ Intervention jälkeiset resurssit ({params.interventionSlots} paikkaa/vk) riittävät juuri uusien potilaiden hoitamiseen.</p>
                ) : (
                  <p className="mt-2">✅ Intervention jälkeiset resurssit ({params.interventionSlots} paikkaa/vk) riittävät kaikkien uusien potilaiden hoitamiseen.</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Panel */}
      <Card className="lg:col-span-2 shadow-sm">
        <CardHeader>
          <CardTitle>Simulaation tulokset</CardTitle>
          <CardDescription>
            {simulationResults ? 
              `Simulaation kesto: ${params.simulationDurationWeeks} viikkoa` :
              "Suorita simulaatio nähdäksesi tulokset"
            }
          </CardDescription>
        </CardHeader>

        <CardContent>
          {simulationResults ? (
            <>
              {/* Metrics comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <SimulationResult 
                  title="Perustilanne" 
                  slotsPerWeek={params.slotsPerWeek}
                  results={simulationResults.baselineResults} 
                />
                <SimulationResult 
                  title="Intervention jälkeen" 
                  slotsPerWeek={params.interventionSlots}
                  results={simulationResults.interventionResults} 
                  comparisonResults={simulationResults.baselineResults}
                />
              </div>
              
              {/* Chart tabs */}
              <Tabs value={activeResultTab} onValueChange={setActiveResultTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="queue">Jonon kehitys</TabsTrigger>
                  <TabsTrigger value="surgeries">Leikkaukset</TabsTrigger>
                  <TabsTrigger value="cumulative">Kumulatiivinen</TabsTrigger>
                </TabsList>
                
                <TabsContent value="queue" className="pt-2">
                  <SimulationChart 
                    chartType="queue"
                    simulationResults={simulationResults}
                    duration={params.simulationDurationWeeks}
                  />
                </TabsContent>
                
                <TabsContent value="surgeries" className="pt-2">
                  <SimulationChart 
                    chartType="surgeries"
                    simulationResults={simulationResults}
                    duration={params.simulationDurationWeeks}
                  />
                </TabsContent>
                
                <TabsContent value="cumulative" className="pt-2">
                  <SimulationChart 
                    chartType="cumulative"
                    simulationResults={simulationResults}
                    duration={params.simulationDurationWeeks}
                  />
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <BarChart className="w-16 h-16 mb-4 opacity-20" />
              <p>Suorita simulaatio nähdäksesi tulokset ja kuvaajat</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default QueueSimulator;
