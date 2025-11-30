import React from 'react';
import { Card } from '../ui/primitives/card';
import { BarChart3 } from 'lucide-react';

const ExecutiveSummarySection = ({ overview }) => {
  if (!overview) return null;

  return (
    <Card className="p-6 border border-border bg-card">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-foreground" />
        <h3 className="text-2xl font-bold text-foreground">Business Intelligence Summary</h3>
      </div>
      <div className="text-base leading-relaxed text-muted-foreground">
        {overview}
      </div>
    </Card>
  );
};

export default ExecutiveSummarySection;