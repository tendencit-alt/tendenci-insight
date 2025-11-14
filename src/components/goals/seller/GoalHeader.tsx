import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface GoalHeaderProps {
  userName: string;
  userAvatar?: string;
  motivationalMessage: {
    text: string;
    color: string;
  };
}

export function GoalHeader({ userName, userAvatar, motivationalMessage }: GoalHeaderProps) {
  const currentMonth = format(new Date(), "MMMM 'de' yyyy", { locale: ptBR });
  const firstName = userName.split(" ")[0];

  return (
    <Card className="bg-gradient-to-r from-primary to-primary-dark text-primary-foreground shadow-lg">
      <div className="p-6 flex items-center gap-6">
        <Avatar className="h-20 w-20 border-4 border-primary-foreground/20">
          <AvatarImage src={userAvatar} alt={userName} />
          <AvatarFallback className="text-2xl bg-primary-light">
            {firstName.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-1">
            🔥 Olá, {firstName}!
          </h1>
          <p className="text-primary-foreground/80 mb-2 capitalize">
            {currentMonth}
          </p>
          <p className={`text-lg font-medium ${motivationalMessage.color}`}>
            {motivationalMessage.text}
          </p>
        </div>
      </div>
    </Card>
  );
}
