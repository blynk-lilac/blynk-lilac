import { MoreHorizontal, Edit, Trash2, Globe, Lock, Users, UserCheck, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface PostMenuProps {
  postId: string;
  isOwner: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function PostMenu({ postId, isOwner, onEdit, onDelete }: PostMenuProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState<string>("");

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId);

      if (error) throw error;

      toast.success("Publicação eliminada");
      onDelete?.();
    } catch (error) {
      toast.error("Erro ao eliminar publicação");
    }
    setShowDeleteDialog(false);
  };

  const handleReport = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Criar denúncia
      const { error } = await supabase.from("reports").insert({
        reporter_id: user.id,
        reported_content_id: postId,
        content_type: "post",
        reason: reportReason,
      });

      if (error) throw error;

      // Notificar admins
      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (admins) {
        for (const admin of admins) {
          await supabase.from("notifications").insert({
            user_id: admin.user_id,
            type: "report",
            title: "Nova Denúncia",
            message: `Denúncia de publicação: ${reportReason}`,
            related_id: postId,
          });
        }
      }

      toast.success("Denúncia enviada aos administradores");
    } catch (error) {
      toast.error("Erro ao enviar denúncia");
    }
    setShowReportDialog(false);
  };

  const handleVisibilityChange = async (visibility: string) => {
    try {
      const { error } = await supabase
        .from("posts")
        .update({ visibility })
        .eq("id", postId);

      if (error) throw error;

      toast.success("Visibilidade atualizada");
    } catch (error) {
      toast.error("Erro ao atualizar visibilidade");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {isOwner ? (
            <>
              {onEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => handleVisibilityChange("public")}>
                <Globe className="mr-2 h-4 w-4" />
                Público
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleVisibilityChange("private")}>
                <Lock className="mr-2 h-4 w-4" />
                Privado (Apenas eu)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleVisibilityChange("followers")}>
                <Users className="mr-2 h-4 w-4" />
                Seguidores
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleVisibilityChange("friends")}>
                <UserCheck className="mr-2 h-4 w-4" />
                Amigos
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuItem onClick={() => {
                setReportReason("Conta falsa");
                setShowReportDialog(true);
              }}>
                <Flag className="mr-2 h-4 w-4" />
                Denunciar conta falsa
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                setReportReason("Publicação falsa");
                setShowReportDialog(true);
              }}>
                <Flag className="mr-2 h-4 w-4" />
                Denunciar publicação falsa
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Publicação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja eliminar esta publicação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Denúncia</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja denunciar esta publicação por: {reportReason}?
              Os administradores serão notificados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReport}>
              Enviar Denúncia
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
