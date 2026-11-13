'use client';
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { Dialog, DialogContent } from './ui/dialog';
import { BusInfo, ChatMessageInfo } from '@/lib/types';
import { fetchJson } from '@/lib/utils';

const nameKey = 'campusride-chat-name';

export function DriverChat({
  bus,
  open,
  onOpenChange,
}: {
  bus: BusInfo;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const list = useRef<HTMLDivElement>(null);
  const queryKey = ['chat', bus.id];
  const messages = useQuery({
    queryKey,
    queryFn: () => fetchJson<{ messages: ChatMessageInfo[] }>(`/api/chat?busId=${bus.id}`),
    enabled: open,
    refetchInterval: 4000,
  });
  const send = useMutation({
    mutationFn: () =>
      fetchJson<{ message: ChatMessageInfo }>('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ busId: bus.id, name: name.trim() || undefined, body: text }),
      }),
    onSuccess: () => {
      setText('');
      queryClient.invalidateQueries({ queryKey });
    },
  });
  useEffect(() => {
    setName(localStorage.getItem(nameKey) ?? '');
  }, []);
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [messages.data?.messages.length, open]);
  const items = messages.data?.messages ?? [];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={`Chat with ${bus.driverName}`}
        description={`Bus ${bus.busNumber} · ${bus.route.name}`}
      >
        <div className="chat-panel">
          <div className="chat-messages" ref={list} aria-live="polite">
            {items.length === 0 && (
              <p className="chat-empty">
                {messages.isPending
                  ? 'Loading messages…'
                  : 'No messages yet. Ask the driver about timing or pick-up.'}
              </p>
            )}
            {items.map((message) => (
              <div key={message.id} className={`chat-bubble ${message.sender.toLowerCase()}`}>
                <small>
                  {message.sender === 'DRIVER' ? `${message.senderName} (driver)` : message.senderName}
                  {' · '}
                  {new Date(message.createdAt).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </small>
                <p>{message.body}</p>
              </div>
            ))}
          </div>
          <p className="chat-note">Everyone on this bus can see the messages. Keep it short and polite.</p>
          <form
            className="chat-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (!text.trim() || send.isPending) return;
              localStorage.setItem(nameKey, name.trim());
              send.mutate();
            }}
          >
            <input
              aria-label="Your name"
              className="chat-name"
              placeholder="Your name"
              maxLength={40}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <input
              aria-label="Message"
              className="chat-text"
              placeholder="Type a message…"
              maxLength={300}
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
            <button className="button button-primary" disabled={!text.trim() || send.isPending}>
              <Send size={15} />
              Send
            </button>
          </form>
          {send.error && <p className="chat-error">{send.error.message}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
