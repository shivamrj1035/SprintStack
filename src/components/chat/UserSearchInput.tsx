import { useState, useEffect, useRef } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { searchChatUsers, generateInviteLink } from "@/server-fns/chat";

export interface SelectedUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

interface Props {
  organizationId?: string | null;
  isPersonalWorkspace: boolean;
  currentUserId?: string;
  selected: SelectedUser[];
  onSelect: (user: SelectedUser) => void;
  onRemove: (userId: string) => void;
  placeholder?: string;
}

export function UserSearchInput({
  organizationId,
  isPersonalWorkspace,
  currentUserId,
  selected,
  onSelect,
  onRemove,
  placeholder = "Search people…",
}: Props) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [results, setResults] = useState<SelectedUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [inviting, setInviting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (inputValue.trim().length < 1) {
      setResults([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchChatUsers({
          data: { query: inputValue.trim(), organizationId: organizationId ?? null },
        });
        const filtered = res.users
          .filter((u) => !selected.some((s) => s.id === u.id))
          .filter((u) => u.id !== currentUserId);
        setResults(
          filtered.map((u) => ({
            id: u.id,
            name: u.name ?? u.email ?? u.id,
            email: u.email ?? "",
            avatarUrl: u.avatarUrl ?? null,
          })),
        );
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue, organizationId, selected, currentUserId]);

  const handleInvite = async () => {
    const email = inputValue.trim();
    if (!email.includes("@")) {
      toast.error("Enter a valid email to invite");
      return;
    }
    setInviting(true);
    try {
      const { inviteUrl } = await generateInviteLink({ data: { email } });
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("Invite link copied to clipboard!");
      setInputValue("");
    } catch {
      toast.error("Failed to generate invite link");
    } finally {
      setInviting(false);
    }
  };

  const initials = (name: string) =>
    name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <div className="flex flex-col gap-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((u) => (
            <Badge key={u.id} variant="secondary" className="gap-1 pl-1">
              <Avatar className="h-4 w-4">
                {u.avatarUrl && <AvatarImage src={u.avatarUrl} />}
                <AvatarFallback className="text-[8px]">{initials(u.name)}</AvatarFallback>
              </Avatar>
              <span className="text-xs">{u.name}</span>
              <button
                onClick={() => onRemove(u.id)}
                className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <div className="relative">
            <Command shouldFilter={false} className="border rounded-md">
              <CommandInput
                placeholder={placeholder}
                value={inputValue}
                onValueChange={(v) => {
                  setInputValue(v);
                  setOpen(v.length > 0);
                }}
                onFocus={() => inputValue.length > 0 && setOpen(true)}
              />
            </Command>
          </div>
        </PopoverAnchor>

        <PopoverContent
          className="p-0 w-[var(--radix-popover-trigger-width)]"
          onOpenAutoFocus={(e) => e.preventDefault()}
          align="start"
        >
          <Command shouldFilter={false}>
            <CommandList>
              {searching && (
                <CommandEmpty>
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                </CommandEmpty>
              )}

              {!searching && results.length === 0 && inputValue.length > 0 && (
                <CommandEmpty>
                  <div className="flex flex-col items-center gap-2 py-1">
                    <span className="text-sm text-muted-foreground">No users found</span>
                    {isPersonalWorkspace && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        onClick={handleInvite}
                        disabled={inviting}
                      >
                        {inviting ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Link2 className="h-3 w-3" />
                        )}
                        Invite &quot;{inputValue}&quot; via link
                      </Button>
                    )}
                  </div>
                </CommandEmpty>
              )}

              {results.length > 0 && (
                <CommandGroup>
                  {results.map((user) => (
                    <CommandItem
                      key={user.id}
                      value={user.id}
                      onSelect={() => {
                        onSelect(user);
                        setInputValue("");
                        setOpen(false);
                        setResults([]);
                      }}
                    >
                      <Avatar className="h-6 w-6 mr-2">
                        {user.avatarUrl && <AvatarImage src={user.avatarUrl} />}
                        <AvatarFallback className="text-[10px]">
                          {initials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm">{user.name}</span>
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
