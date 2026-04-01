import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// --- HELPER FUNCTIONS (Extracted from calculations.ts) ---

function getActualForCategory(transactions, branchId, categoryId, year, month) {
    return transactions
        .filter(tx => {
            if (branchId !== 'ALL' && tx.branchId !== branchId) return false
            if (tx.categoryId !== categoryId) return false
            const d = new Date(tx.date)
            return d.getFullYear() === year && (d.getMonth() + 1) === month
        })
        .reduce((sum, tx) => sum + tx.amount, 0)
}

function buildCashFlowRows(plan, categories, transactions) {
    return plan.categoryPlans
        .filter(cp => !cp.disabled)
        .map(cp => {
            const cat = categories.find(c => c.id === cp.categoryId)
            if (!cat) return null
            const actual = getActualForCategory(transactions, plan.branchId, cp.categoryId, plan.year, plan.month)
            const planned = cp.plannedAmount
            const pct = planned > 0 ? (actual / planned) * 100 : actual > 0 ? 999 : 0
            const isRevenue = cat.section === 'revenue'
            const remaining = isRevenue ? actual - planned : planned - actual
            const isNegativeStatus = isRevenue ? (actual < planned) : (actual > planned)

            let status = 'ok'
            if (isRevenue) {
                if (pct < (cp.alertThreshold * 100)) status = planned > 0 ? 'warning' : 'ok'
                if (actual < planned * 0.5) status = 'exceeded'
            } else {
                if (pct >= (cp.alertThreshold * 100) && pct < 100) status = 'warning'
                if (pct > 100) status = 'exceeded'
            }

            return {
                categoryId: cp.categoryId,
                categoryName: cat.name,
                section: cat.section,
                planned,
                actual,
                delta: actual - planned,
                remaining,
                isNegativeStatus,
                pct,
                alertThreshold: cp.alertThreshold,
                status,
                disabled: cp.disabled,
            }
        })
        .filter(Boolean)
}

function computeCashFlowSnapshot(plans, categories, transactions, year, month, targetBranchId, allowedBranchIds) {
    const branchIdToUse = targetBranchId || 'ALL'
    const validPlans = plans.filter(p => 
        p.year === year && 
        p.month === month && 
        (branchIdToUse === 'ALL' 
            ? (!allowedBranchIds || allowedBranchIds.includes(p.branchId))
            : p.branchId === branchIdToUse)
    )
    const totalKPI = validPlans.reduce((sum, p) => sum + (p.kpiRevenue || 0), 0)
    const systemCategoryPlans = {}
    
    for (const p of validPlans) {
        for (const cp of p.categoryPlans) {
            if (cp.disabled) continue
            if (!systemCategoryPlans[cp.categoryId]) {
                systemCategoryPlans[cp.categoryId] = {
                    categoryId: cp.categoryId,
                    rate: cp.rate,
                    fixedAmount: 0,
                    plannedAmount: 0,
                    alertThreshold: cp.alertThreshold,
                    disabled: false
                }
            }
            systemCategoryPlans[cp.categoryId].plannedAmount += cp.plannedAmount
        }
    }

    const unifiedPlan = {
        id: 'snapshot',
        branchId: branchIdToUse,
        year,
        month,
        kpiRevenue: totalKPI,
        categoryPlans: Object.values(systemCategoryPlans)
    }

    const rows = buildCashFlowRows(unifiedPlan, categories, transactions)
    return { rows, kpiRevenue: totalKPI }
}

// --- MAIN FUNCTION ---

serve(async (req) => {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Lấy thời điểm hiện tại VN (UTC + 7)
    // Nếu chạy cron vào 17:00 UTC thì lúc này ở VN là 00:00 ngày mới.
    // Tuy nhiên đề bài nói hằng ngày 00:00 UTC+7. 
    // Chúng ta sẽ tính snapshot cho tháng hiện tại.
    const now = new Date(new Date().getTime() + 7 * 60 * 60 * 1000)
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    
    console.log(`Starting automated sync for ${month}/${year}...`)

    // 1. Fetch Categories
    const { data: categories } = await supabaseAdmin.from('categories').select('*')
    
    // 2. Fetch Spa Branches (Only filter Spa as requested)
    const { data: branches } = await supabaseAdmin.from('branches').select('*').eq('type', 'spa')
    const branchIds = branches?.map(b => b.id) || []
    
    // 3. Fetch Monthly Plans
    const { data: plans } = await supabaseAdmin.from('monthly_plans').select('*').eq('year', year).eq('month', month)
    
    // 4. Fetch Transactions for the month
    const { data: transactions } = await supabaseAdmin.from('transactions').select('*')
      .gte('date', `${year}-${month.toString().padStart(2, '0')}-01`)
      .lte('date', `${year}-${month.toString().padStart(2, '0')}-31T23:59:59`)

    const targets = ['ALL', ...branchIds]
    const upserts = []

    for (const targetBranchId of targets) {
      const result = computeCashFlowSnapshot(plans, categories, transactions, year, month, targetBranchId, branchIds)
      
      upserts.push({
        year,
        month,
        branch_id: targetBranchId,
        snapshot_data: result,
        updated_at: new Date().toISOString()
      })
    }

    if (upserts.length > 0) {
      const { error } = await supabaseAdmin
        .from('cashflow_snapshots')
        .upsert(upserts, { onConflict: 'year,month,branch_id' })
      
      if (error) throw error
    }

    return new Response(JSON.stringify({ 
      message: `Successfully synced ${upserts.length} snapshots for ${month}/${year}`,
      targets 
    }), { 
      headers: { 'Content-Type': 'application/json' } 
    })

  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
