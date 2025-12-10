import { cn } from "@/lib/utils";
import { Activity, Calendar } from "lucide-react";
import { format } from "date-fns";

interface TimelineItem {
  id: string;
  date: string;
  title: string;
  value: string;
  unit?: string;
  category: string;
}

interface TimelineChartProps {
  items: TimelineItem[];
  className?: string;
}

const categoryColors: Record<string, string> = {
  Diabetes: "bg-amber-500/20 border-amber-500 text-amber-600 dark:text-amber-400",
  Hypertension: "bg-red-500/20 border-red-500 text-red-600 dark:text-red-400",
  Cholesterol: "bg-purple-500/20 border-purple-500 text-purple-600 dark:text-purple-400",
  Thyroid: "bg-blue-500/20 border-blue-500 text-blue-600 dark:text-blue-400",
  "Kidney Function": "bg-green-500/20 border-green-500 text-green-600 dark:text-green-400",
  "Liver Function": "bg-orange-500/20 border-orange-500 text-orange-600 dark:text-orange-400",
  "Complete Blood Count": "bg-pink-500/20 border-pink-500 text-pink-600 dark:text-pink-400",
  Other: "bg-gray-500/20 border-gray-500 text-gray-600 dark:text-gray-400",
};

export function TimelineChart({ items, className }: TimelineChartProps) {
  if (items.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
        <Activity className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No health data recorded yet</p>
        <p className="text-sm text-muted-foreground mt-1">Upload medical reports to see your health timeline</p>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-transparent" />
      
      <div className="space-y-6">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="relative pl-14 animate-fade-in-up"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="absolute left-4 w-4 h-4 rounded-full bg-primary border-4 border-background shadow-lg" />
            
            <div
              className={cn(
                "p-4 rounded-lg border-l-4 transition-all",
                "bg-card/50 backdrop-blur-sm",
                categoryColors[item.category] || categoryColors.Other
              )}
            >
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h4 className="font-semibold text-foreground">{item.title}</h4>
                  <p className="text-2xl font-bold mt-1">
                    {item.value}
                    {item.unit && <span className="text-sm font-normal text-muted-foreground ml-1">{item.unit}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>{format(new Date(item.date), "MMM d, yyyy")}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
