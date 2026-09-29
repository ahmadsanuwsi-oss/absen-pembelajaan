import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";

export function ChangePasswordDialog({ open, onOpenChange }) {
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await api.post("/auth/change-password", { old_password: oldPw, new_password: newPw });
      toast.success("Password berhasil diubah");
      setOldPw(""); setNewPw("");
      onOpenChange(false);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Ubah Password</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Password Lama</Label>
            <Input type="password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} data-testid="old-password-input" />
          </div>
          <div>
            <Label>Password Baru</Label>
            <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} data-testid="new-password-input" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={submit} disabled={loading || !oldPw || !newPw} className="bg-[#800020] hover:bg-[#6B0D24]" data-testid="submit-change-password">Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
