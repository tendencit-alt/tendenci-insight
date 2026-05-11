import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Construction, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { ReactNode } from "react";

interface ComingSoonPageProps {
  title: string;
  description: string;
  icon?: ReactNode;
  bullets?: string[];
}

export default function ComingSoonPage({ title, description, icon, bullets }: ComingSoonPageProps) {
  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/central-navegacao"><ArrowLeft className="h-4 w-4 mr-1" />Voltar</Link>
        </Button>
      </div>
      <Card className="p-12 flex flex-col items-center justify-center text-center border-dashed">
        <div className="p-4 rounded-full bg-primary/10 text-primary mb-4">
          {icon ?? <Construction className="h-8 w-8" />}
        </div>
        <h1 className="text-2xl font-bold mb-2">{title}</h1>
        <Badge variant="secondary" className="mb-4">Em breve</Badge>
        <p className="text-sm text-muted-foreground max-w-md mb-6">{description}</p>
        {bullets && bullets.length > 0 && (
          <ul className="text-sm text-muted-foreground text-left list-disc list-inside space-y-1">
            {bullets.map((b) => <li key={b}>{b}</li>)}
          </ul>
        )}
      </Card>
    </div>
  );
}
