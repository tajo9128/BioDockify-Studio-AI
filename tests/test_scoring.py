"""Unit tests for composite scoring functions."""
import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from rdkit import Chem
from rdkit.Chem import AllChem

from docking_engine import (
    calculate_hydrophobic_enclosure_score,
    calculate_rotatable_bond_penalty,
    calculate_lipophilic_contact_term,
    apply_composite_scoring,
)


def _embed(smiles: str):
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return None
    mol = Chem.AddHs(mol)
    AllChem.EmbedMolecule(mol, randomSeed=42)
    AllChem.MMFFOptimizeMolecule(mol)
    return mol


RECEPTOR_HYDROPHOBIC = """ATOM      1  CA  ALA A   1      10.000  10.000  10.000  1.00  0.00           C
ATOM      2  CB  ALA A   1      11.000  10.000  10.000  1.00  0.00           C
ATOM      3  CG  VAL A   2      10.500  11.000  10.000  1.00  0.00           C
ATOM      4  CG  LEU A   3       5.000   5.000   5.000  1.00  0.00           C
ATOM      5  CD1 LEU A   3       6.000   5.000   5.000  1.00  0.00           C"""


class TestHydrophobicEnclosure:
    def test_basic_favorable(self):
        ligand = _embed('c1ccccc1')
        assert ligand is not None
        score = calculate_hydrophobic_enclosure_score(ligand, RECEPTOR_HYDROPHOBIC)
        assert score <= 0

    def test_no_receptor(self):
        ligand = _embed('CCO')
        score = calculate_hydrophobic_enclosure_score(ligand, "")
        assert score == 0.0

    def test_polar_ligand(self):
        ligand = _embed('O')
        score = calculate_hydrophobic_enclosure_score(ligand, RECEPTOR_HYDROPHOBIC)
        assert score == 0.0


class TestRotatableBondPenalty:
    def test_zero_bonds(self):
        assert calculate_rotatable_bond_penalty(0) == 0.0

    def test_scaling(self):
        assert calculate_rotatable_bond_penalty(5) == pytest.approx(0.29, rel=0.1)

    def test_capped(self):
        assert calculate_rotatable_bond_penalty(50) == pytest.approx(0.5, rel=0.01)


class TestLipophilicContact:
    def test_favorable_contact(self):
        ligand = _embed('CC(C)C')
        assert ligand is not None
        score = calculate_lipophilic_contact_term(ligand, RECEPTOR_HYDROPHOBIC)
        assert score <= 0

    def test_no_receptor(self):
        ligand = _embed('CC')
        score = calculate_lipophilic_contact_term(ligand, "")
        assert score == 0.0


class TestCompositeScoring:
    def test_applies_all_terms(self):
        ligand = _embed('c1ccccc1')
        results = [{"mode": 1, "vina_score": -6.5}]
        scored = apply_composite_scoring(results, ligand, RECEPTOR_HYDROPHOBIC, 3)
        assert len(scored) == 1
        assert "hydrophobic_term" in scored[0]
        assert "rotatable_penalty" in scored[0]
        assert "lipo_contact" in scored[0]
        assert "composite_score" in scored[0]

    def test_no_mol_graceful(self):
        results = [{"mode": 1, "vina_score": -5.0}]
        scored = apply_composite_scoring(results, None, "", 0)
        assert scored[0]["composite_score"] == -5.0
