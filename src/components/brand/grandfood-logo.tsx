import Image from "next/image";

export function GrandFoodMark({ className }: { className?: string }) {
  return (
    <Image
      src="/grandfood-mark.svg"
      alt=""
      width={100}
      height={100}
      className={className}
      aria-hidden="true"
      priority
    />
  );
}

export function GrandFoodLogo({
  className,
  markClassName = "h-7 w-7",
  wordmarkClassName = "text-sm font-extrabold text-foreground",
}: {
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
}) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <GrandFoodMark className={markClassName} />
      <span className={wordmarkClassName}>GrandFood</span>
    </div>
  );
}
