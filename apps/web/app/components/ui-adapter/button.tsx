import { Button as BaseButton, buttonVariants } from "@ecoctrl/ui";
import { cn } from "~/lib/utils";

function Button({ className, ...props }: React.ComponentProps<typeof BaseButton>) {
  return <BaseButton className={cn("rounded-lg h-8 px-2.5", className)} {...props} />;
}

export { Button, buttonVariants };
