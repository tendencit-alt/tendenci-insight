import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Lock } from 'lucide-react';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { supabase } from '@/integrations/supabase/client';
import { getFirstAllowedRoute } from '@/hooks/useFirstAllowedRoute';
import { ForgotPasswordDialog } from '@/components/auth/ForgotPasswordDialog';

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const { data: companySettings } = useCompanySettings();
  const companyLogo = companySettings?.logo_url;
  const companyName = companySettings?.trade_name || companySettings?.company_name || 'Sistema';
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });
  const [signupData, setSignupData] = useState({
    email: '',
    password: '',
    fullName: '',
    confirmPassword: ''
  });
  const {
    signIn,
    signUp,
    user,
    profile
  } = useAuth();
  const navigate = useNavigate();

  // Redirecionar usuários já autenticados baseado em suas permissões
  useEffect(() => {
    const redirectAuthenticatedUser = async () => {
      if (user && profile) {
        // Owner/Admin/Master => acesso global, redirecionar direto
        const isMaster =
          profile.is_owner === true ||
          profile.role === 'admin' ||
          profile.role === 'owner' ||
          profile.role === 'tenant_owner' ||
          profile.role === 'master';

        if (isMaster) {
          navigate('/');
          return;
        }
        
        // Buscar permissões do usuário
        const { data: userPermissions } = await supabase
          .from('user_permissions')
          .select('module, can_view')
          .eq('user_id', user.id)
          .eq('can_view', true);
        
        const targetRoute = getFirstAllowedRoute(userPermissions, false);
        navigate(targetRoute);
      }
    };
    
    redirectAuthenticatedUser();
  }, [user, profile, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginData.email || !loginData.password) {
      toast.error('Por favor, preencha todos os campos');
      return;
    }
    setLoading(true);
    
    const { error } = await signIn(loginData.email, loginData.password);
    
    if (error) {
      console.error('Login error:', error);
      const message = error.message?.includes('Invalid login credentials')
        ? 'Email ou senha incorretos'
        : error.message || 'Erro ao fazer login';

      setLoading(false);
      window.requestAnimationFrame(() => toast.error(message));
      return;
    }
    
    toast.success('Login realizado com sucesso!');

    // Buscar dados do usuário para determinar redirecionamento
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    if (authUser) {
      // Buscar profile
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authUser.id)
        .single();
      
      const isMaster = userProfile?.role === 'admin';
      
      if (isMaster) {
        navigate('/');
        setLoading(false);
        return;
      }
      
      // Buscar permissões do usuário
      const { data: userPermissions } = await supabase
        .from('user_permissions')
        .select('module, can_view')
        .eq('user_id', authUser.id)
        .eq('can_view', true);
      
      const targetRoute = getFirstAllowedRoute(userPermissions, false);
      navigate(targetRoute);
    } else {
      navigate('/');
    }
    
    setLoading(false);
  };
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupData.email || !signupData.password || !signupData.fullName) {
      toast.error('Por favor, preencha todos os campos');
      return;
    }
    if (signupData.password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    if (signupData.password !== signupData.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }
    setLoading(true);
    const {
      error
    } = await signUp(signupData.email, signupData.password, signupData.fullName);
    if (error) {
      console.error('Signup error:', error);
      if (error.message.includes('already registered')) {
        toast.error('Este email já está cadastrado');
      } else {
        toast.error(error.message || 'Erro ao criar conta');
      }
    } else {
      toast.success('Conta criada! Você já pode fazer login.');
      setSignupData({
        email: '',
        password: '',
        fullName: '',
        confirmPassword: ''
      });
    }
    setLoading(false);
  };
  return <div translate="no" className="notranslate min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-muted/30 p-4">
      <Card className="w-full max-w-md shadow-2xl animate-fade-in animate-scale-in">
        <CardHeader className="space-y-4 border-0 bg-popover">
          <div className="flex justify-center">
            {companyLogo ? (
              <img src={companyLogo} alt={companyName} className="h-32 w-auto" />
            ) : (
              <span className="text-3xl font-bold">{companyName}</span>
            )}
          </div>
          <div className="text-center space-y-2">
            
            <CardDescription className="text-muted-foreground">
              Sistema de Gestão 
 
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'login' | 'signup')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Cadastro</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" forceMount className="data-[state=inactive]:hidden">
              <form onSubmit={handleLogin} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input id="login-email" type="email" placeholder="seu@email.com" value={loginData.email} onChange={e => setLoginData({
                  ...loginData,
                  email: e.target.value
                })} disabled={loading} required />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="login-password">Senha</Label>
                  <Input id="login-password" type="password" placeholder="••••••••" value={loginData.password} onChange={e => setLoginData({
                  ...loginData,
                  password: e.target.value
                })} disabled={loading} required />
                </div>
                
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Entrando...
                    </> : <>
                      <Lock className="mr-2 h-4 w-4" />
                      Entrar
                    </>}
                </Button>

                <div className="text-center">
                  <Button
                    type="button"
                    variant="link"
                    className="text-sm text-muted-foreground"
                    onClick={() => setForgotPasswordOpen(true)}
                  >
                    Esqueci minha senha
                  </Button>
                </div>
              </form>
            </TabsContent>
            
            <TabsContent value="signup" forceMount className="data-[state=inactive]:hidden">
              <form onSubmit={handleSignup} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Nome Completo</Label>
                  <Input id="signup-name" type="text" placeholder="Seu nome" value={signupData.fullName} onChange={e => setSignupData({
                  ...signupData,
                  fullName: e.target.value
                })} disabled={loading} required />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input id="signup-email" type="email" placeholder="seu@email.com" value={signupData.email} onChange={e => setSignupData({
                  ...signupData,
                  email: e.target.value
                })} disabled={loading} required />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha</Label>
                  <Input id="signup-password" type="password" placeholder="••••••••" value={signupData.password} onChange={e => setSignupData({
                  ...signupData,
                  password: e.target.value
                })} disabled={loading} required minLength={6} />
                  <p className="text-xs text-muted-foreground">Mínimo de 6 caracteres</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm">Confirmar Senha</Label>
                  <Input id="signup-confirm" type="password" placeholder="••••••••" value={signupData.confirmPassword} onChange={e => setSignupData({
                  ...signupData,
                  confirmPassword: e.target.value
                })} disabled={loading} required />
                </div>
                
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Criando conta...
                    </> : 'Criar Conta'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-center text-muted-foreground">
              🔒 Seus dados estão protegidos com criptografia de ponta a ponta
            </p>
          </div>
        </CardContent>
      </Card>

      <ForgotPasswordDialog
        open={forgotPasswordOpen}
        onOpenChange={setForgotPasswordOpen}
      />
    </div>;
};
export default Auth;