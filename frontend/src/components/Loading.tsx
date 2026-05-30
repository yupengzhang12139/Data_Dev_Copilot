interface Props {
  text?: string;
}

export function Loading({ text = "加载中..." }: Props) {
  return (
    <div className="card p-8 flex flex-col items-center gap-3 text-slate-500">
      <div className="h-8 w-8 rounded-full border-4 border-brand-100 border-t-brand-500 animate-spin" />
      <div className="text-sm">{text}</div>
    </div>
  );
}
