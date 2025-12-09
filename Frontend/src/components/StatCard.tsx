import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  delay?: number;
}

const StatCard = ({ label, value, suffix = "", prefix = "", delay = 0 }: StatCardProps) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      let start = 0;
      const end = value;
      const duration = 2000;
      const increment = end / (duration / 16);

      const timer = setInterval(() => {
        start += increment;
        if (start >= end) {
          setCount(end);
          clearInterval(timer);
        } else {
          setCount(Math.floor(start));
        }
      }, 16);

      return () => clearInterval(timer);
    }, delay);

    return () => clearTimeout(timeout);
  }, [value, delay]);

  return (
    <Card className="p-6 text-center hover:shadow-lg transition-shadow duration-300 border-primary/20 animate-counter">
      <div className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
        {prefix}{count.toLocaleString()}{suffix}
      </div>
      <div className="text-sm text-muted-foreground font-medium">{label}</div>
    </Card>
  );
};

export default StatCard;
