import { lazy, Suspense } from 'react'
import { LoadingState } from '@/components/ui/DataState'
import './QuoteModelsPage.css'

const Calculator = lazy(() => import('./QuoteModelsPage'))

export default function LazyQuoteModelsPage(){
  return <Suspense fallback={<LoadingState/>}><Calculator/></Suspense>
}
