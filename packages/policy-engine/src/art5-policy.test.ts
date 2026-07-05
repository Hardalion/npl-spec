import { describe, expect, it } from 'vitest'
import { evaluateExecutionPayload } from './engine.js'

describe('eu-ai-act-art5-prohibited NPL policy', () => {
  it('blocks social scoring via NPL', () => {
    const decision = evaluateExecutionPayload({
      args: {
        actionType: 'EVALUATE_USER_TRUST',
        metadataSource: 'SOCIAL_BEHAVIOR',
        dataTypes: [],
        hasBiometricInference: false,
      },
    })
    expect(decision.matched).toBe(true)
    expect(decision.action).toBe('BLOCK')
    expect(decision.ruleId).toBe('EU_AI_ACT_ART5_SOCIAL_SCORING')
  })

  it('allows benign financial tool call', () => {
    const decision = evaluateExecutionPayload({
      args: {
        actionType: 'FETCH_RATES',
        dataTypes: ['MARKET_DATA'],
        hasBiometricInference: false,
        toolName: 'fetch_financial_data',
      },
    })
    expect(decision.action).not.toBe('BLOCK')
  })
})
