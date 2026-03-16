import React, { use } from 'react'
import TrackingClient from './TrackingClient'

export const dynamicParams = false

export function generateStaticParams() {
    return [{ id: 'placeholder' }]
}

export default function TrackingPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
    const params = use(paramsPromise)
    return <TrackingClient id={params.id} />
}
