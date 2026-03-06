import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { SearchBar } from "@/components/SearchBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, BookOpen, Mail } from "lucide-react";

const faqs = [
  { q: "How do I update my membership?", a: "Go to your Membership section and click on 'Upgrade Plan'. You can choose from available plans and pay directly through the app." },
  { q: "How do I track my workouts?", a: "Navigate to the Workouts tab to view your assigned workout plan. You can log completed exercises and track your progress." },
  { q: "How do I reset my password?", a: "On the login page, tap 'Forgot Password' and enter your email. You'll receive a link to reset your password." },
  { q: "How do I contact my trainer?", a: "Your assigned trainer's contact details are available in your Dashboard. You can also reach them through the in-app messaging feature." },
  { q: "How do I view my attendance?", a: "Go to More → Attendance to see your monthly attendance history and streaks." },
  { q: "How do I update my diet plan?", a: "Diet plans are managed by your trainer. You can view your current plan in the Diet tab and request changes through your trainer." },
];

export default function HelpPage() {
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const { toast } = useToast();

  const filteredFaqs = faqs.filter(
    (faq) => faq.q.toLowerCase().includes(search.toLowerCase()) || faq.a.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    // TODO: Submit to backend
    toast({ title: "Support ticket submitted! We'll get back to you soon." });
    setSubject("");
    setMessage("");
  };

  return (
    <div>
      <PageHeader title="Help & Support" />
      <div className="px-4 space-y-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search help topics..." />

        {/* FAQ */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Frequently Asked Questions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {filteredFaqs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No results found</p>
            ) : (
              <Accordion type="single" collapsible className="w-full">
                {filteredFaqs.map((faq, i) => (
                  <AccordionItem key={i} value={`faq-${i}`}>
                    <AccordionTrigger className="text-sm text-left">{faq.q}</AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground">{faq.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Submit a Support Ticket
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitTicket} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="subject" className="text-xs">Subject</Label>
                <Input id="subject" placeholder="What do you need help with?" value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="message" className="text-xs">Message</Label>
                <Textarea id="message" placeholder="Describe your issue..." rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" size="sm">Send Ticket</Button>
            </form>
          </CardContent>
        </Card>

        {/* Contact info */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Email Support</p>
                <p className="text-xs text-muted-foreground">support@rudrafitness.com</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
