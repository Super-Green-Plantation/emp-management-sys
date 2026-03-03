import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Building2, Filter, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const Index = () => {
  const queryClient = useQueryClient();
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    position: "",
  });
  const [editBranches, setEditBranches] = useState<string[]>([]);

  const { data: branches } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const { data, error } = await supabase.from("branches").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: employees, isLoading } = useQuery({
    queryKey: ["employees-with-branches"],
    queryFn: async () => {
      const { data: emps, error: empError } = await supabase
        .from("employees")
        .select("*")
        .order("first_name");
      if (empError) throw empError;

      const { data: links, error: linkError } = await supabase
        .from("employee_branches")
        .select("employee_id, branch_id");
      if (linkError) throw linkError;

      const { data: branchData, error: branchError } = await supabase
        .from("branches")
        .select("*");
      if (branchError) throw branchError;

      const branchMap = new Map(branchData.map((b) => [b.id, b]));

      return emps.map((emp) => ({
        ...emp,
        branches: links
          .filter((l) => l.employee_id === emp.id)
          .map((l) => branchMap.get(l.branch_id))
          .filter(Boolean),
      }));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("employee_branches").delete().eq("employee_id", id);
      const { error } = await supabase.from("employees").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Employee deleted");
      queryClient.invalidateQueries({ queryKey: ["employees-with-branches"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("employees")
        .update({
          first_name: editForm.first_name,
          last_name: editForm.last_name,
          email: editForm.email,
          phone: editForm.phone || null,
          position: editForm.position || null,
        })
        .eq("id", editingEmployee.id);
      if (error) throw error;

      // Update branch assignments
      await supabase.from("employee_branches").delete().eq("employee_id", editingEmployee.id);
      if (editBranches.length > 0) {
        const { error: linkError } = await supabase.from("employee_branches").insert(
          editBranches.map((branchId) => ({
            employee_id: editingEmployee.id,
            branch_id: branchId,
          }))
        );
        if (linkError) throw linkError;
      }
    },
    onSuccess: () => {
      toast.success("Employee updated");
      setEditingEmployee(null);
      queryClient.invalidateQueries({ queryKey: ["employees-with-branches"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const openEdit = (emp: any) => {
    setEditingEmployee(emp);
    setEditForm({
      first_name: emp.first_name,
      last_name: emp.last_name,
      email: emp.email,
      phone: emp.phone || "",
      position: emp.position || "",
    });
    setEditBranches(emp.branches.map((b: any) => b.id));
  };

  const filteredEmployees =
    branchFilter === "all"
      ? employees
      : employees?.filter((emp) =>
          emp.branches.some((b: any) => b.id === branchFilter)
        );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Overview of all employees and their branch assignments
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card border rounded-lg p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{employees?.length ?? 0}</p>
              <p className="text-sm text-muted-foreground">Total Employees</p>
            </div>
          </div>
          <div className="bg-card border rounded-lg p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{branches?.length ?? 0}</p>
              <p className="text-sm text-muted-foreground">Total Branches</p>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Filter by branch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches?.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="bg-card border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Branches</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredEmployees?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No employees found. Add some to get started.
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmployees?.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium">
                      {emp.first_name} {emp.last_name}
                    </TableCell>
                    <TableCell>{emp.email}</TableCell>
                    <TableCell>{emp.phone || "—"}</TableCell>
                    <TableCell>{emp.position || "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {emp.branches.map((b: any) => (
                          <Badge key={b.id} variant="secondary" className="text-xs">
                            {b.name}
                          </Badge>
                        ))}
                        {emp.branches.length === 0 && (
                          <span className="text-muted-foreground text-xs">None</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(emp)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteMutation.mutate(emp.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingEmployee} onOpenChange={(open) => !open && setEditingEmployee(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input
                  value={editForm.first_name}
                  onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input
                  value={editForm.last_name}
                  onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Position</Label>
              <Input
                value={editForm.position}
                onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Branches</Label>
              <div className="space-y-2">
                {branches?.map((branch) => (
                  <label key={branch.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={editBranches.includes(branch.id)}
                      onCheckedChange={() =>
                        setEditBranches((prev) =>
                          prev.includes(branch.id)
                            ? prev.filter((id) => id !== branch.id)
                            : [...prev, branch.id]
                        )
                      }
                    />
                    <span className="text-sm">{branch.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <Button type="submit" disabled={updateMutation.isPending} className="w-full">
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Index;
