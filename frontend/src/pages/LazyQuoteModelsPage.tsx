import { lazy, Suspense } from 'react'
import { LoadingState } from '@/components/ui/DataState'
import type { QuoteCalculatorProps } from './QuoteModelsPage'
import './QuoteModelsPage.css'

const Calculator = lazy(() => import('./QuoteModelsPage'))

export default function LazyQuoteModelsPage(props:QuoteCalculatorProps){
  return <Suspense fallback={<LoadingState/>}><Calculator {...props}/></Suspense>
}
