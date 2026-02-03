import { cn } from "@/lib/utils"
import { m } from "@/paraglide/messages"
import { Loader2Icon } from "lucide-react"

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <Loader2Icon
      role="status"
      aria-label={m.loading()}
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  )
}

export { Spinner }
