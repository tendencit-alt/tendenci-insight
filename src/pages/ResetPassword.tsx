import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, KeyRound, CheckCircle } from 'lucide-react';
import tendenciLogo from '@/assets/tendenci-logo-new.png';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for recovery token in URL hash
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get('type');
    if (type === 'recovery') {
      setIsRecovery(true);
    }

    // Also listen for auth state change with recovery event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      console.error('Reset password error:', error);
      toast.error(error.message || 'Erro ao redefinir senha');
    } else {
      setSuccess(true);
      toast.success('Senha redefinida com sucesso!');
      setTimeout(() => navigate('/auth'), 3000);
    }

    setLoading(false);
  };

  if (!isRecovery && !success) {
    return (
      <div translate="no" className="notranslate min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-muted/30 p-4">
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader className="space-y-4 bg-popover">
            <div className="flex justify-center">
              <img src={tendenciLogo} alt="Tendenci" className="h-32 w-auto" />
            </div>
            <div className="text-center space-y-2">
              <CardTitle className="text-xl">Link inválido</CardTitle>
              <CardDescription>
                Este link de recuperação é inválido ou expirou. Solicite um novo link na tela de login.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <Button className="w-full" onClick={() => navigate('/auth')}>
              Voltar ao Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div translate="no" className="notranslate min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-muted/30 p-4">
      <Card className="w-full max-w-md shadow-2xl animate-fade-in">
        <CardHeader className="space-y-4 bg-popover">
          <div className="flex justify-center">
            <img src={tendenciLogo} alt="Tendenci" className="h-32 w-auto" />
          </div>
          <div className="text-center space-y-2">
            <CardTitle className="text-xl flex items-center justify-center gap-2">
              <KeyRound className="w-5 h-5" />
              Redefinir Senha
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Digite sua nova senha abaixo
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {success ? (
            <div className="text-center space-y-4">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
              <p className="text-sm text-muted-foreground">
                Senha redefinida com sucesso! Redirecionando para o login...
              </p>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nova Senha</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-new-password">Confirmar Nova Senha</Label>
                <Input
                  id="confirm-new-password"
                  type="password"
                  placeholder="Digite novamente"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redefinindo...
                  </>
                ) : (
                  'Redefinir Senha'
                )}
              </Button>
            </form>
          )}

          <div className="mt-4 text-center">
            <Button variant="link" className="text-sm" onClick={() => navigate('/auth')}>
              Voltar ao Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
