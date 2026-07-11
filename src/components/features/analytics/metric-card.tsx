import { Card, CardContent } from "@/components/ui/card";
import { TrendingDown, TrendingUp } from "lucide-react";

export const MetricCard = ({ title, value, change, icon: Icon, trend }: any) => (
  


    <Card className="border border-gray-200 rounded-sm shadow-sm">
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">{title}</p>
            <h3 className="text-xl font-semibold mt-2">{value}</h3>
  
            <div className="flex items-center gap-1 mt-1">
              {trend === 'up' ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
              <span className={`text-xs ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {change}
              </span>
            </div>
          </div>
  
          <div className="w-10 h-10 bg-gray-100 rounded-sm flex items-center justify-center border border-gray-200">
            <Icon className="w-5 h-5 text-gray-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
  