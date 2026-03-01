"use client";

import React from "react";
import { ArrowLeft, FileText, CheckCircle2, ShieldAlert } from "lucide-react";
import Link from "next/link";
import Card from "@/components/ui/Card";

export default function TermsPage() {
  const sections = [
    {
      title: "Seller Conduct",
      icon: CheckCircle2,
      content: "As a seller on Vendly, you agree to provide accurate product information, maintain inventory reliability, and fulfill orders within the specified timeframe. Misrepresentation of goods is strictly prohibited."
    },
    {
      title: "Prohibited Items",
      icon: ShieldAlert,
      content: "Sellers may not list illegal substances, weapons, counterfeit goods, or items that violate intellectual property rights. Vendly reserves the right to remove any listing and suspend accounts that violate these policies."
    },
    {
      title: "Payments & Fees",
      icon: FileText,
      content: "Transaction fees apply to each sale made through the platform. Payouts are processed to your linked account after successful delivery verification. Detailed fee structures are available in the Seller Agreement."
    }
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link 
        href="/dashboard/settings"
        className="inline-flex items-center gap-2 text-xs font-bold text-muted hover:text-foreground transition-colors group mb-2"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        Back to Settings
      </Link>

      <div className="px-2">
        <h2 className="text-md font-black tracking-tight uppercase">Terms & Conditions</h2>
        <p className="text-xs text-muted font-medium mt-1">Review the legal guidelines for selling on Vendly</p>
      </div>

      <div className="space-y-6 pb-10">
        <Card className="p-6 md:p-10 border-none shadow-sm space-y-10" hoverEffect={false}>
          <div className="space-y-4">
             <h1 className="text-xl font-black text-foreground">Vendly Seller Agreement</h1>
             <p className="text-[10px] text-muted font-bold uppercase tracking-widest bg-border/20 inline-block px-3 py-1 rounded-full">Last Updated: February 2026</p>
          </div>

          <div className="space-y-8">
            {sections.map((section, idx) => (
              <div key={idx} className="space-y-3">
                <div className="flex items-center gap-3">
                   <section.icon className="w-4 h-4 text-primary" />
                   <h3 className="text-xs font-black uppercase text-foreground">{section.title}</h3>
                </div>
                <p className="text-xs text-muted leading-relaxed font-medium">
                  {section.content}
                </p>
              </div>
            ))}
          </div>

          <div className="pt-10 border-t border-border/50">
             <p className="text-xs text-muted font-medium bg-surface/50 p-4 rounded-2xl italic">
               By continuing to use Vendly as a seller, you acknowledge that you have read and agree to these terms. Failure to comply may result in account termination.
             </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
