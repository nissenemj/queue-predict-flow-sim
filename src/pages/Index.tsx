
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
import { ChevronDown, ChevronUp, InfoIcon, BarChart } from "lucide-react";
import QueueSimulator from '@/components/QueueSimulator';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const Index = () => {
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Leikkausjonon Simulaattori</h1>
          <p className="text-gray-600 max-w-3xl">
            Simuloi leikkausjonon kehitystä ja testaa resurssimuutosten vaikutusta jonon pituuteen ja odotusaikoihin.
          </p>
          
          <Collapsible
            open={isInfoOpen}
            onOpenChange={setIsInfoOpen}
            className="mt-4 bg-white rounded-lg border shadow-sm"
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
                Simulaatiossa oletetaan FIFO-jonotus (First In, First Out), eli potilaat hoidetaan saapumisjärjestyksessä.
                Malli ei huomioi peruutuksia tai kausittaista vaihtelua potilaiden saapumisessa.
              </p>
            </CollapsibleContent>
          </Collapsible>
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
