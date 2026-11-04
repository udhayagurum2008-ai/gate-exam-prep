import { EnrichedQuestion, SubjectDomain } from '../types/gate';

export interface FormulaCardItem {
  id: string;
  title: string;
  domain: SubjectDomain;
  topic: string;
  formula: string;
  definition: string;
  applicationHint: string;
  verificationStatus: 'verified_core' | 'question_bank_derived';
  relatedQuestionIds: string[];
}

export const VERIFIED_CORE_FORMULAS: FormulaCardItem[] = [
  {
    id: 'f_ece_nt_1',
    title: 'Thevenin & Maximum Power Transfer Theorem',
    domain: 'ece_core',
    topic: 'Network Theory',
    formula: 'Z_L = Z_th*  |  P_max = |V_th|² / (4 · R_th)',
    definition:
      'For maximum average power transfer to a complex load Z_L from a linear two-terminal AC network, the load impedance must equal the complex conjugate of the Thevenin impedance (Z_L = R_th − jX_th). For purely resistive networks, R_L = R_th.',
    applicationHint: 'Check whether the load is variable resistance only (R_L = |Z_th|) or full complex conjugate matching (Z_L = Z_th*).',
    verificationStatus: 'verified_core',
    relatedQuestionIds: [],
  },
  {
    id: 'f_ece_nt_2',
    title: 'Transient Response of Series RLC & Quality Factor',
    domain: 'ece_core',
    topic: 'Network Theory',
    formula: 'ω_0 = 1 / √(L·C)  |  ζ = (R / 2) · √(C / L)  |  Q = 1 / (2ζ) = (1 / R) · √(L / C)',
    definition:
      'Resonant angular frequency ω_0, damping ratio ζ, and quality factor Q for a series RLC circuit. For a parallel RLC circuit, Q_parallel = R · √(C / L) and BW = ω_0 / Q.',
    applicationHint: 'Critical damping occurs at ζ = 1, i.e., R = 2√(L/C) for series RLC.',
    verificationStatus: 'verified_core',
    relatedQuestionIds: [],
  },
  {
    id: 'f_ece_ss_1',
    title: 'Continuous-Time Fourier Transform & Parseval Relation',
    domain: 'ece_core',
    topic: 'Signals & Systems',
    formula: 'X(jω) = ∫ x(t) e^(−jωt) dt  |  E_x = ∫ |x(t)|² dt = (1 / 2π) ∫ |X(jω)|² dω',
    definition:
      'Relates time-domain signal energy E_x to its spectral energy density |X(jω)|². Duality and time-scaling: x(a·t) ↔ (1/|a|) X(jω/a).',
    applicationHint: 'Use Parseval’s theorem whenever integrating sinc²(t) or complicated squared time functions.',
    verificationStatus: 'verified_core',
    relatedQuestionIds: [],
  },
  {
    id: 'f_ece_ss_2',
    title: 'Nyquist Sampling Theorem & Aliasing',
    domain: 'ece_core',
    topic: 'Signals & Systems',
    formula: 'f_s ≥ 2 · f_max  |  f_Nyquist = 2 · f_max',
    definition:
      'A band-limited low-pass signal with maximum frequency component f_max can be uniquely reconstructed from uniform samples taken at f_s ≥ 2·f_max. For bandpass signals, f_s = 2·B / k where k = ⌊f_H / B⌋.',
    applicationHint: 'When signals are multiplied in time x₁(t)·x₂(t), their bandwidths ADD: f_max = f₁ + f₂.',
    verificationStatus: 'verified_core',
    relatedQuestionIds: [],
  },
  {
    id: 'f_ece_ed_1',
    title: 'Mass-Action Law & Built-in Potential in PN Junction',
    domain: 'ece_core',
    topic: 'Electronic Devices',
    formula: 'n · p = n_i²  |  V_bi = V_T · ln((N_A · N_D) / n_i²)  |  V_T = kT / q ≈ 25.9 mV at 300 K',
    definition:
      'In thermal equilibrium, the product of electron and hole concentrations equals the squared intrinsic concentration n_i². Depletion width W ∝ √(V_bi + V_R).',
    applicationHint: 'Depletion region penetrates deeper into the lightly doped side: x_n · N_D = x_p · N_A.',
    verificationStatus: 'verified_core',
    relatedQuestionIds: [],
  },
  {
    id: 'f_ece_ac_1',
    title: 'Op-Amp Closed-Loop Gain & Slew Rate Limit',
    domain: 'ece_core',
    topic: 'Analog Circuits',
    formula: 'A_v(inv) = −R_f / R_1  |  A_v(non-inv) = 1 + R_f / R_1  |  SR = max|dV_o/dt| = 2π · f_max · V_p',
    definition:
      'Ideal negative-feedback op-amp configurations enforce virtual short (V_+ ≈ V_−). Maximum undistorted sinusoidal operating frequency is limited by Slew Rate SR (V/μs).',
    applicationHint: 'Always convert SR from V/μs to V/s (×10⁶) when computing f_max.',
    verificationStatus: 'verified_core',
    relatedQuestionIds: [],
  },
  {
    id: 'f_ece_dc_1',
    title: 'CMOS Propagation Delay, Power Dissipation & Flip-Flop Timing',
    domain: 'ece_core',
    topic: 'Digital Circuits',
    formula: 'P_dyn = α · C_L · V_DD² · f_clk  |  T_clk ≥ t_pcq + t_comb + t_setup − t_skew',
    definition:
      'Dynamic power in CMOS scales quadratically with supply voltage V_DD and linearly with switching frequency f_clk. Maximum clock frequency in synchronous sequential circuits is set by setup time constraints.',
    applicationHint: 'To avoid hold-time violation: t_ccq + t_comb(min) ≥ t_hold + t_skew.',
    verificationStatus: 'verified_core',
    relatedQuestionIds: [],
  },
  {
    id: 'f_ece_cs_1',
    title: 'Standard Second-Order Control System & Steady-State Error',
    domain: 'ece_core',
    topic: 'Control Systems',
    formula: 'T(s) = ω_n² / (s² + 2ζω_n s + ω_n²)  |  %MP = 100 · exp(−πζ / √(1 − ζ²))  |  t_s(2%) ≈ 4 / (ζω_n)',
    definition:
      'Closed-loop transfer function of prototype second-order system. Peak overshoot %MP depends solely on damping ratio ζ. Steady-state error for unity feedback: e_ss = lim(s→0) [s · R(s) / (1 + G(s))].',
    applicationHint: 'Phase Margin PM ≈ 100·ζ for low damping ratios; system is stable iff all Routh-Hurwitz first-column entries have the same sign.',
    verificationStatus: 'verified_core',
    relatedQuestionIds: [],
  },
  {
    id: 'f_ece_comm_1',
    title: 'Shannon-Hartley Capacity & AM/FM Modulation Power',
    domain: 'ece_core',
    topic: 'Communications',
    formula: 'C = B · log₂(1 + SNR) bps  |  P_t(AM) = P_c · (1 + μ² / 2)  |  BW_FM = 2(Δf + f_m) = 2(β + 1)f_m',
    definition:
      'Shannon capacity gives the theoretical upper bound on error-free bit rate over an AWGN channel of bandwidth B. Carson’s rule approximates FM transmission bandwidth.',
    applicationHint: 'For 100% modulated single-tone AM (μ = 1), total sideband power is 1/3 of total transmitted power (efficiency η = 33.33%).',
    verificationStatus: 'verified_core',
    relatedQuestionIds: [],
  },
  {
    id: 'f_ece_em_1',
    title: 'Transmission Line Reflection Coefficient, VSWR & Skin Depth',
    domain: 'ece_core',
    topic: 'Electromagnetics',
    formula: 'Γ_L = (Z_L − Z_0) / (Z_L + Z_0)  |  VSWR = (1 + |Γ_L|) / (1 − |Γ_L|)  |  δ = 1 / √(π · f · μ · σ)',
    definition:
      'Voltage reflection coefficient Γ_L at load termination Z_L on a lossless line of characteristic impedance Z_0. Quarter-wave transformer input impedance: Z_in = Z_0² / Z_L.',
    applicationHint: 'For matched load Z_L = Z_0, Γ_L = 0 and VSWR = 1. For short or open circuit, |Γ_L| = 1 and VSWR → ∞.',
    verificationStatus: 'verified_core',
    relatedQuestionIds: [],
  },
  {
    id: 'f_math_la_1',
    title: 'Eigenvalue & Matrix Determinant Properties',
    domain: 'eng_math',
    topic: 'Linear Algebra',
    formula: '∑ λ_i = Trace(A)  |  ∏ λ_i = det(A)  |  det(k·A_n×n) = k^n · det(A)',
    definition:
      'The sum of eigenvalues of any square matrix equals its trace (sum of main diagonal elements), and the product of eigenvalues equals its determinant. By Cayley-Hamilton theorem, every square matrix satisfies its own characteristic equation.',
    applicationHint: 'Eigenvalues of A⁻¹ are 1/λ_i, and eigenvalues of A^m are λ_i^m.',
    verificationStatus: 'verified_core',
    relatedQuestionIds: [],
  },
  {
    id: 'f_math_prob_1',
    title: 'Bayes Theorem, Poisson & Normal Distributions',
    domain: 'eng_math',
    topic: 'Probability & Statistics',
    formula: 'P(A|B) = [P(B|A) · P(A)] / P(B)  |  P(X = k) = (λ^k · e^(−λ)) / k!  |  Var(aX + bY) = a²Var(X) + b²Var(Y) + 2ab·Cov(X,Y)',
    definition:
      'Bayes theorem updates prior probability P(A) given evidence B. For Poisson distribution, Mean E[X] = Variance Var(X) = λ.',
    applicationHint: 'If X and Y are independent random variables, E[XY] = E[X]E[Y] and Cov(X,Y) = 0.',
    verificationStatus: 'verified_core',
    relatedQuestionIds: [],
  },
];

export function buildCompleteFormulaLibrary(questions: EnrichedQuestion[]): FormulaCardItem[] {
  const cards: FormulaCardItem[] = VERIFIED_CORE_FORMULAS.map((item) => ({
    ...item,
    relatedQuestionIds: [],
  }));

  // Map related question IDs to core verified cards
  const topicToCoreCard = new Map<string, FormulaCardItem[]>();
  for (const c of cards) {
    const arr = topicToCoreCard.get(c.topic) || [];
    arr.push(c);
    topicToCoreCard.set(c.topic, arr);
  }

  // Also extract distinct, non-trivial formulas from the question bank per topic
  const seenFormulaPerTopic = new Map<string, Set<string>>();
  const derivedCards: FormulaCardItem[] = [];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const coreArr = topicToCoreCard.get(q.topic);
    if (coreArr) {
      for (const c of coreArr) {
        if (c.relatedQuestionIds.length < 15) {
          c.relatedQuestionIds.push(q.id);
        }
      }
    }

    const formText = (q.form || '').trim();
    if (!formText || formText.length < 8) continue;

    let set = seenFormulaPerTopic.get(q.topic);
    if (!set) {
      set = new Set<string>();
      seenFormulaPerTopic.set(q.topic, set);
    }

    const normForm = formText.toLowerCase();
    if (!set.has(normForm) && set.size < 4) {
      set.add(normForm);
      derivedCards.push({
        id: `qb_form_${q.id}`,
        title: `${q.topic} — Key Formula & Concept (${q.id})`,
        domain: q.domain,
        topic: q.topic,
        formula: formText,
        definition: q.sol.slice(0, 220) + (q.sol.length > 220 ? '…' : ''),
        applicationHint: `Applied in ${q.exam} (${q.diff} difficulty) — Question ${q.id}`,
        verificationStatus: 'question_bank_derived',
        relatedQuestionIds: [q.id],
      });
    }
  }

  return [...cards, ...derivedCards];
}
