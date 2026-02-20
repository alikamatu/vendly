"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, MoreVertical, CheckCircle, XCircle, Clock } from "lucide-react";
import Card from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

// Mock data
const users = [
  { id: 1, name: "Alex Johnson", email: "alex@example.com", role: "USER", status: "approved" },
  { id: 2, name: "Sam Smith", email: "sam@example.com", role: "ADMIN", status: "pending" },
  { id: 3, name: "Taylor Lee", email: "taylor@example.com", role: "USER", status: "rejected" },
  { id: 4, name: "Jordan Kim", email: "jordan@example.com", role: "USER", status: "approved" },
    { id: 5, name: "Casey Nguyen", email: "casey@example.com", role: "USER", status: "pending" },
    { id: 6, name: "Morgan Davis", email: "morgan@example.com", role: "USER", status: "approved" },
    { id: 7, name: "Riley Wilson", email: "riley@example.com", role: "USER", status: "pending" },
    { id: 8, name: "Quinn Brown", email: "quinn@example.com", role: "ADMIN", status: "approved" },
    { id: 9, name: "Blake Martinez", email: "blake@example.com", role: "USER", status: "rejected" },
    { id: 10, name: "Avery Garcia", email: "avery@example.com", role: "USER", status: "approved" },
    { id: 11, name: "Dakota Rodriguez", email: "dakota@example.com", role: "USER", status: "pending" },
    { id: 12, name: "Phoenix Miller", email: "phoenix@example.com", role: "USER", status: "approved" },
    { id: 13, name: "Sage Anderson", email: "sage@example.com", role: "ADMIN", status: "approved" },
    { id: 14, name: "River Taylor", email: "river@example.com", role: "USER", status: "rejected" },
    { id: 15, name: "Sky Thomas", email: "sky@example.com", role: "USER", status: "pending" },
    { id: 16, name: "Skylar Jackson", email: "skylar@example.com", role: "USER", status: "approved" },
    { id: 17, name: "Cameron White", email: "cameron@example.com", role: "USER", status: "pending" },
    { id: 18, name: "Reese Harris", email: "reese@example.com", role: "USER", status: "approved" },
    { id: 19, name: "Finley Clark", email: "finley@example.com", role: "USER", status: "rejected" },
    { id: 20, name: "Bailey Lewis", email: "bailey@example.com", role: "ADMIN", status: "approved" },
    { id: 21, name: "Rowan Walker", email: "rowan@example.com", role: "USER", status: "pending" },
    { id: 22, name: "Emerson Hall", email: "emerson@example.com", role: "USER", status: "approved" },
    { id: 23, name: "Peyton Allen", email: "peyton@example.com", role: "USER", status: "approved" },
    { id: 24, name: "Sydney Young", email: "sydney@example.com", role: "USER", status: "rejected" },
    { id: 25, name: "Jordan Price", email: "jordan.p@example.com", role: "USER", status: "pending" },
    { id: 26, name: "Casey Bennett", email: "casey.b@example.com", role: "ADMIN", status: "approved" },
    { id: 27, name: "Marley Wood", email: "marley@example.com", role: "USER", status: "approved" },
    { id: 28, name: "River Ross", email: "river.r@example.com", role: "USER", status: "pending" },
    { id: 29, name: "Oakley Henderson", email: "oakley@example.com", role: "USER", status: "approved" },
    { id: 30, name: "Harley Coleman", email: "harley@example.com", role: "USER", status: "rejected" },
    { id: 31, name: "Charlie Jenkins", email: "charlie@example.com", role: "USER", status: "approved" },
    { id: 32, name: "Artemis Perry", email: "artemis@example.com", role: "USER", status: "pending" },
    { id: 33, name: "Cypress Powell", email: "cypress@example.com", role: "ADMIN", status: "approved" },
    { id: 34, name: "Indigo Long", email: "indigo@example.com", role: "USER", status: "rejected" },
    { id: 35, name: "Lennox Patterson", email: "lennox@example.com", role: "USER", status: "approved" },
];

const statusIcon = {
  approved: <CheckCircle size={14} className="text-green-600" />,
  pending: <Clock size={14} className="text-amber-600" />,
  rejected: <XCircle size={14} className="text-red-600" />,
};

export default function UsersTab() {
  const [search, setSearch] = useState("");

  const filtered = users.filter(
    (u) => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.includes(search)
  );

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search users..."
          leftIcon={<Search size={16} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-[--color-surface]"
        />
        <Button variant="primary" size="sm" className="whitespace-nowrap">
          Add user
        </Button>
      </div>

      {/* Users list */}
      <Card className="divide-y divide-[--color-border]">
        {filtered.map((user, i) => (
          <motion.div
            key={user.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.03 }}
            className="flex items-center justify-between p-3 hover:bg-[--color-surface-hover] transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[--color-primary]/10 flex items-center justify-center text-[--color-primary] font-medium">
                {user.name[0]}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-[10px] text-[--color-foreground]/50 truncate">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-[--color-surface]">
                {statusIcon[user.status as keyof typeof statusIcon]}
                <span className="capitalize">{user.status}</span>
              </span>
              <button className="p-1 rounded hover:bg-[--color-surface]">
                <MoreVertical size={14} />
              </button>
            </div>
          </motion.div>
        ))}
        {filtered.length === 0 && (
          <p className="p-4 text-xs text-center text-[--color-foreground]/50">No users found</p>
        )}
      </Card>
    </div>
  );
}