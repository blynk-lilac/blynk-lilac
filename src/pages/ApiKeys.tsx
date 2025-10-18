import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Key, Trash2, Plus, Eye, EyeOff } from "lucide-react";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  created_at: string;
  last_used: string | null;
}

export default function ApiKeys() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("api_keys")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar chaves API");
      return;
    }

    setApiKeys(data || []);
  };

  const generateApiKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = 'blynk_';
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toast.error("Digite um nome para a chave");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const apiKey = generateApiKey();

      const { error } = await supabase.from("api_keys").insert({
        user_id: user.id,
        name: newKeyName,
        key: apiKey,
      });

      if (error) throw error;

      toast.success("Chave API criada com sucesso!");
      setNewKeyName("");
      loadApiKeys();
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar chave");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm("Deseja realmente deletar esta chave? Sites que a utilizam deixarão de funcionar.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("api_keys")
        .delete()
        .eq("id", keyId);

      if (error) throw error;

      toast.success("Chave deletada");
      loadApiKeys();
    } catch (error: any) {
      toast.error("Erro ao deletar chave");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Chave copiada!");
  };

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(keyId)) {
        newSet.delete(keyId);
      } else {
        newSet.add(keyId);
      }
      return newSet;
    });
  };

  const maskKey = (key: string) => {
    return key.substring(0, 12) + "..." + key.substring(key.length - 4);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background pb-16">
        <Navbar />
        
        <div className="container mx-auto max-w-4xl px-4 py-8">
          <div className="flex items-center gap-3 mb-6">
            <Key className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Chaves API</h1>
              <p className="text-sm text-muted-foreground">Gerencie suas chaves para integração com outros sites</p>
            </div>
          </div>

          {/* Criar nova chave */}
          <Card className="p-6 mb-6 bg-card border-border">
            <h2 className="text-lg font-semibold mb-4">Criar Nova Chave API</h2>
            <div className="flex gap-3">
              <Input
                placeholder="Nome da chave (ex: Site Principal)"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="flex-1"
              />
              <Button 
                onClick={handleCreateKey}
                disabled={loading || !newKeyName.trim()}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Criar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Use esta chave para permitir que outros sites façam requisições ao nosso servidor (curtidas, comentários, etc).
            </p>
          </Card>

          {/* Lista de chaves */}
          <div className="space-y-4">
            {apiKeys.length === 0 ? (
              <Card className="p-8 bg-card border-border text-center">
                <Key className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">Nenhuma chave API criada ainda</p>
              </Card>
            ) : (
              apiKeys.map((apiKey) => (
                <Card key={apiKey.id} className="p-6 bg-card border-border">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2">{apiKey.name}</h3>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <code className="text-sm bg-muted px-3 py-1 rounded flex-1 font-mono">
                          {visibleKeys.has(apiKey.id) ? apiKey.key : maskKey(apiKey.key)}
                        </code>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => toggleKeyVisibility(apiKey.id)}
                        >
                          {visibleKeys.has(apiKey.id) ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(apiKey.key)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>Criada: {new Date(apiKey.created_at).toLocaleDateString('pt-BR')}</span>
                        {apiKey.last_used && (
                          <span>Último uso: {new Date(apiKey.last_used).toLocaleDateString('pt-BR')}</span>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDeleteKey(apiKey.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Documentação */}
          <Card className="p-6 mt-6 bg-card border-border">
            <h2 className="text-lg font-semibold mb-3">Como usar</h2>
            <div className="space-y-2 text-sm text-foreground">
              <p>Para usar as chaves API em outro site, inclua a chave no header das requisições:</p>
              <code className="block bg-muted p-3 rounded text-xs overflow-x-auto">
                {`Authorization: Bearer sua_chave_api_aqui`}
              </code>
              <p className="mt-4">Endpoints disponíveis:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li><code>/api/posts/:id/like</code> - Curtir post</li>
                <li><code>/api/posts/:id/unlike</code> - Descurtir post</li>
                <li><code>/api/comments/:id/like</code> - Curtir comentário</li>
                <li><code>/api/posts</code> - Listar posts</li>
              </ul>
            </div>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
