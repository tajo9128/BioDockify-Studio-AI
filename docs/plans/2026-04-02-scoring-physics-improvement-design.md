# BioDockify Scoring & Physics Improvement Plan

> **Goal**: Transform BioDockify from a functional prototype into a production-grade docking platform competitive with Schrödinger Glide.

## Architecture

5 incremental phases, each with its own commit + tag:

| Phase | Tag | Description | New Files | Modified Files |
|-------|-----|-------------|-----------|----------------|
| 1. Scoring Physics | v2.4.9 | Hydrophobic enclosure, rotatable penalty, lipophilic contacts | `tests/test_scoring.py` | `docking_engine.py`, `main.py` |
| 2. Flexibility | v2.5.0 | Side-chain flexibility via rotamer library, ensemble docking | `flexibility.py` | `docking_engine.py`, `main.py`, `Docking.tsx` |
| 3. Constraints | v2.5.1 | H-bond, positional, metal coordination constraints | `constraints.py` | `docking_engine.py`, `main.py`, `Docking.tsx` |
| 4. Frontend | v2.5.2 | Scoring breakdown UI, constraint config, flexibility toggle | None | `Docking.tsx` |
| 5. Benchmarking | v2.6.0 | PDBbind benchmarking, RMSD, enrichment metrics | `benchmarking.py` | `main.py`, `requirements.txt` |

## Phase 1: Scoring Physics (v2.4.9)

### New scoring functions in `docking_engine.py`:

1. **`calculate_hydrophobic_enclosure_score(ligand_mol, receptor_pdbqt, cutoff=4.5)`**
   - Identifies hydrophobic ligand atoms (C, S, halogens not in polar groups)
   - Identifies hydrophobic receptor residues (ALA, VAL, LEU, ILE, MET, PHE, TRP, TYR, PRO)
   - Calculates fraction of hydrophobic ligand atoms with nearby receptor neighbors
   - Returns negative score (favorable) proportional to enclosure quality
   - Scale factor: -0.5 * (enclosure_fraction)

2. **`calculate_rotatable_bond_penalty(num_rotatable, max_penalty=0.5)`**
   - GlideScore-style entropy penalty: 0.058 * N_rot, capped at 0.5
   - Always positive (unfavorable), added to score

3. **`calculate_lipophilic_contact_term(ligand_mol, receptor_pdbqt, contact_cutoff=4.0)`**
   - Rewards favorable lipophilic contacts between ligand and receptor
   - Linear falloff: max reward at contact, zero at cutoff
   - Scale factor: -0.3 * contact_count

### Integration in `smart_dock()`:

- Always-on composite scoring (no toggle)
- After Vina/GNINA scoring, compute all 3 terms for each pose
- Add to result dict: `hydrophobic_term`, `rotatable_penalty`, `lipo_contact`, `composite_score`
- `composite_score = vina_score + hydrophobic_term + rotatable_penalty + lipo_contact`

### API changes:

- `/api/docking/run` response includes `scoring_breakdown` per pose
- `DockingRunRequest` model unchanged (composite scoring always on)

### Tests:

- `tests/test_scoring.py` — 3 unit tests for each scoring function

## Phase 2: Flexibility (v2.5.0)

### New file: `backend/flexibility.py`

- `ROTAMER_LIBRARY` — Dunbrack-style rotamer data for 14 residue types
- `identify_flexible_residues(receptor_pdb, ligand_coords, cutoff=6.0)` — finds flexible residues near ligand
- `apply_rotamer(receptor_mol, residue_info, rotamer)` — applies rotamer conformation
- `generate_flexible_receptor_ensemble(receptor_pdb, ligand_mol, n_rotamers=3, max_combos=27)` — generates ensemble

### Integration:

- New parameter `enable_flexibility: bool = False` in `smart_dock()`
- When enabled: generates ensemble, docks against each conformation, re-ranks combined results
- Max 3 flexible residues, max 27 combinations

### API changes:

- Add `enable_flexibility: bool = False` to `DockingRunRequest`

### Frontend:

- Toggle in Docking.tsx: "Enable Side-Chain Flexibility"
- Warning about increased runtime + ETA estimate

## Phase 3: Constraints (v2.5.1)

### New file: `backend/constraints.py`

- `HydrogenBondConstraint` — enforce H-bond between ligand atom and receptor atom
- `PositionalConstraint` — restrain ligand atoms to spherical volume
- `MetalCoordinationConstraint` — enforce proper geometry for metal-coordinating ligands

### Integration:

- Each constraint has `evaluate(ligand_mol, receptor_pdbqt)` returning penalty score
- After docking, penalties added to each pose's `final_score`, poses re-ranked

### API changes:

- Add `constraints: Optional[List[Dict]]` to `DockingRunRequest`

### Frontend:

- Constraint configuration UI in Docking.tsx
- Dropdown for type, type-specific inputs, weight slider

## Phase 4: Frontend Enhancements (v2.5.2)

- Show scoring breakdown in results panel (vina, hydrophobic, lipo, rotatable, composite)
- Constraint configuration UI
- Flexibility toggle with runtime warning/ETA
- Highlight constrained atoms in 3D viewer

## Phase 5: Benchmarking (v2.6.0)

### New file: `backend/benchmarking.py`

- `calculate_pose_rmsd(predicted_pdbqt, reference_pdbqt)` — RMSD calculation
- `calculate_enrichment_metrics(scores, labels)` — AUC-ROC, EF@X%, BEDROC
- `run_pdbbind_benchmark(pdbbind_dir, output_file, docking_params)` — full benchmark

### New API endpoints:

- `POST /api/benchmark/run` — start benchmark job
- `GET /api/benchmark/results/{job_id}` — retrieve results

### New deps:

- `scikit-learn` (ROC AUC)
- `scipy` (math utilities)

## Expected Impact

| Improvement | Expected RMSD Gain | Expected EF1% Gain |
|------------|-------------------|-------------------|
| Hydrophobic enclosure | +0.3-0.5 Å | +2-4x |
| Rotatable penalty | +0.1-0.2 Å | +1-2x |
| Lipophilic contacts | +0.2-0.4 Å | +2-3x |
| Side-chain flexibility | +0.5-1.0 Å | +3-8x |
| H-bond constraints | +0.4-0.8 Å (when used) | +5-15x (targeted) |

**Target**: PDBbind core set pose prediction success rate (RMSD <2Å) of ≥65% (vs current ~45-50% for Vina-only).
