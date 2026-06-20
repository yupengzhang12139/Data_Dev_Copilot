import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { Layout } from "../components/Layout";
import { Loading } from "../components/Loading";

export function BuildPage() {
  const { rid } = useParams<{ rid: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeFile, setActiveFile] = useState(0);
  const [writeRes, setWriteRes] = useState<any>(null);
  const [writing, setWriting] = useState(false);

  useEffect(() => {
    if (!rid) return;
    (async () => {
      setLoading(true);
      try {
        const res = await api.build(rid);
        setData(res.result);
      } finally {
        setLoading(false);
      }
    })();
  }, [rid]);

  const writeToBranch = async () => {
    if (!rid) return;
    setWriting(true);
    try {
      const res = await api.writeBuild(rid);
      setWriteRes(res);
    } finally {
      setWriting(false);
    }
  };

  if (loading || !data) return <Layout current="build"><Loading text="AI 正在生成 dbt model / schema.yml / tests..." /></Layout>;

  const file = data.files[activeFile];

  return (
    <Layout current="build" noSidebar>
      <section className="card p-6">
        <h2 className="text-lg font-semibold">7. dbt 代码生成</h2>
        <p className="mt-1 text-sm text-slate-500">
          目标 model：<code>{data.model_name}</code>。已按现有 dbt 项目模板生成，需 Reviewer 人工 Review。
        </p>

        <div className="mt-5 grid grid-cols-12 gap-4">
          <aside className="col-span-12 md:col-span-3">
            <div className="text-xs font-medium text-slate-500 mb-2">文件</div>
            <ul className="space-y-1">
              {data.files.map((f: any, i: number) => (
                <li key={i}>
                  <button
                    onClick={() => setActiveFile(i)}
                    className={`block w-full text-left px-3 py-2 text-sm rounded-md ${
                      i === activeFile ? "bg-brand-500 text-white" : "hover:bg-slate-100 text-slate-700"
                    }`}
                  >
                    <div className="font-mono text-xs">{f.path}</div>
                    <div className="text-[10px] opacity-70">{f.kind}</div>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
          <div className="col-span-12 md:col-span-9">
            <pre className="text-xs bg-slate-900 text-slate-100 rounded-md p-4 overflow-auto max-h-[480px] whitespace-pre">
{file.content}
            </pre>
          </div>
        </div>
      </section>

      <section className="card p-6 mt-6">
        <h3 className="font-semibold mb-3">Join Key 推荐</h3>
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500 text-xs uppercase">
            <tr>
              <th className="py-2">列名</th>
              <th>置信度</th>
              <th>所在表</th>
              <th>依据</th>
            </tr>
          </thead>
          <tbody>
            {data.join_keys.map((jk: any) => (
              <tr key={jk.column} className="border-t">
                <td className="py-2 font-mono">{jk.column}</td>
                <td>{(jk.confidence * 100).toFixed(0)}%</td>
                <td className="text-slate-500">{jk.tables.join(", ")}</td>
                <td className="text-slate-500">{jk.evidence.join("；")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card p-6 mt-6">
        <h3 className="font-semibold mb-3">基础 Schema Tests</h3>
        <div className="flex flex-wrap gap-2">
          {data.tests.map((t: any, i: number) => (
            <span key={i} className="tag bg-slate-100 text-slate-700 ring-1 ring-slate-200">
              {t.type}({t.column})
            </span>
          ))}
        </div>
      </section>

      <section className="card p-6 mt-6">
        <h3 className="font-semibold mb-3">SQL 优化项</h3>
        <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
          {data.optimizations.map((o: string, i: number) => <li key={i}>{o}</li>)}
        </ul>
      </section>

      <section className="card p-6 mt-6">
        <h3 className="font-semibold mb-3">写入本地 dbt 分支</h3>
        <p className="text-xs text-slate-500 mb-3">
          仅写入文件到本地 dbt 项目目录，不创建 PR、不 merge、不上线。
        </p>
        <div className="flex items-center gap-3">
          <button className="btn-primary" disabled={writing} onClick={writeToBranch}>
            {writing ? "写入中..." : "写入本地分支"}
          </button>
          <button className="btn-secondary" onClick={() => navigate(`/r/${rid}/validate`)}>
            进入验证阶段
          </button>
        </div>
        {writeRes ? (
          <pre className="mt-3 text-xs bg-slate-50 p-3 rounded ring-1 ring-slate-200 overflow-auto">
{JSON.stringify(writeRes, null, 2)}
          </pre>
        ) : null}
      </section>
    </Layout>
  );
}
