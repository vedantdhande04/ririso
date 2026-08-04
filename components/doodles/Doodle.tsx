import Image from "next/image";

const doodles = {
  flower: "/doodles/flower.svg",
  book: "/doodles/book.svg",
  mug: "/doodles/mug.svg",
  star: "/doodles/star.svg",
  leaf: "/doodles/leaf.svg",
  heart: "/doodles/heart.svg",
  blob: "/doodles/blob.svg",
  wave: "/doodles/wave.svg",
  spiral: "/doodles/spiral.svg",
  dots: "/doodles/dots.svg",
  ring: "/doodles/ring.svg",
  bean: "/doodles/bean.svg",
  hash: "/doodles/hash.svg",
  spark: "/doodles/spark.svg",
  sprout: "/doodles/sprout.svg",
} as const;

export type DoodleName = keyof typeof doodles;

type DoodleProps = {
  name: DoodleName;
  size?: number;
  className?: string;
};

export function Doodle({ name, size = 40, className = "" }: DoodleProps) {
  return (
    <Image
      src={doodles[name]}
      alt=""
      width={size}
      height={size}
      className={`pointer-events-none select-none ${className}`}
      aria-hidden
    />
  );
}
