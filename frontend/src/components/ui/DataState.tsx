import { AlertCircle, LoaderCircle } from 'lucide-react'
import type { ReactNode } from 'react'
export function LoadingState() { return <div className="data-state" role="status"><LoaderCircle className="spin" size={24} /><p>Carregando seus dados…</p></div> }
export function ErrorState({ message, retry }: { message: string; retry?: () => void }) { return <div className="data-state error-state" role="alert"><AlertCircle size={25} /><strong>Não foi possível consultar os dados</strong><p>{message}</p>{retry && <button className="button button-secondary" onClick={retry}>Tentar novamente</button>}</div> }
export function EmptyState({ title, text, children }: { title: string; text: string; children?: ReactNode }) { return <div className="data-state"><span className="empty-orbit">✦</span><h3>{title}</h3><p>{text}</p>{children}</div> }
