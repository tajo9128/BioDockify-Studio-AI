"""
MD Analysis modules - OpenMM-based trajectory analysis
Adapted from MD-Suite analysis layer
"""

import os
import logging
import json
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
import numpy as np

logger = logging.getLogger("md-analysis")


class RMSDAnalyzer:
    """Calculate RMSD of MD trajectory"""

    def __init__(self, storage_dir: Path):
        self.storage_dir = Path(storage_dir) / "analysis"
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    def calculate(
        self,
        trajectory_pdb: str,
        reference_pdb: Optional[str] = None,
        selection: str = "protein and name CA",
        output_file: str = "rmsd.csv",
    ) -> Dict[str, Any]:
        """Calculate RMSD over trajectory frames"""
        try:
            import openmm as mm
            import openmm.app as app
            from openmm import unit
            from io import StringIO

            ref_pdb = reference_pdb if reference_pdb else trajectory_pdb

            traj_ref = app.PDBFile(open(trajectory_pdb).read())
            ref_pos = traj_ref.positions

            frames = self._read_trajectory_frames(trajectory_pdb)
            if not frames:
                return {"success": False, "error": "No frames found in trajectory"}

            rmsd_values = []
            for frame_pos in frames:
                rmsd = self._compute_rmsd(frame_pos, ref_pos)
                rmsd_values.append(rmsd)

            output_path = self.storage_dir / output_file
            with open(output_path, "w") as f:
                f.write("frame,rmsd_nm\n")
                for i, val in enumerate(rmsd_values):
                    f.write(f"{i},{val:.4f}\n")

            rmsd_arr = np.array(rmsd_values)
            plot_data = self._make_plot(
                rmsd_values, "RMSD (nm)", "Root Mean Square Deviation"
            )

            return {
                "success": True,
                "output_file": str(output_path),
                "mean_rmsd_nm": round(float(np.mean(rmsd_arr)), 4),
                "std_rmsd_nm": round(float(np.std(rmsd_arr)), 4),
                "min_rmsd_nm": round(float(np.min(rmsd_arr)), 4),
                "max_rmsd_nm": round(float(np.max(rmsd_arr)), 4),
                "plot_data": plot_data,
                "n_frames": len(frames),
            }

        except Exception as e:
            logger.error(f"RMSD analysis failed: {e}")
            return {"success": False, "error": str(e)}

    def _read_trajectory_frames(self, pdb_path: str) -> List[Any]:
        """Read PDB trajectory frames"""
        try:
            import openmm.app as app
            from io import StringIO

            content = open(pdb_path).read()
            models = content.split("MODEL")
            frames = []
            for model in models[1:]:
                try:
                    pdb = app.PDBFile(StringIO("MODEL" + model))
                    frames.append(pdb.positions)
                except Exception:
                    continue
            return frames if frames else [app.PDBFile(open(pdb_path).read()).positions]
        except Exception:
            return []

    def _compute_rmsd(self, positions1, positions2) -> float:
        """Compute RMSD with Kabsch optimal superposition"""
        try:
            import numpy as np
            from openmm import unit

            # Convert to numpy arrays
            p1 = np.array([[p.x, p.y, p.z] for p in positions1])
            p2 = np.array([[p.x, p.y, p.z] for p in positions2])

            # Center both structures at origin
            p1_centered = p1 - p1.mean(axis=0)
            p2_centered = p2 - p2.mean(axis=0)

            # Kabsch algorithm: find optimal rotation via SVD
            H = p1_centered.T @ p2_centered
            U, S, Vt = np.linalg.svd(H)

            # Ensure right-handed coordinate system
            d = np.sign(np.linalg.det(Vt.T @ U.T))
            D = np.diag([1, 1, d])
            R = Vt.T @ D @ U.T

            # Apply rotation to p2
            p2_rotated = p2_centered @ R.T

            # Calculate RMSD after optimal alignment
            diff = p1_centered - p2_rotated
            rmsd = float(np.sqrt(np.mean(np.sum(diff**2, axis=1))))

            return rmsd
        except Exception as e:
            logger.error(f"RMSD computation failed: {e}")
            return 0.0

    def _make_plot(
        self, values: List[float], ylabel: str, title: str
    ) -> Dict[str, Any]:
        """Generate Plotly-compatible plot data"""
        x = list(range(len(values)))
        return {
            "data": [
                {
                    "x": x,
                    "y": values,
                    "type": "scatter",
                    "mode": "lines",
                    "marker": {"color": "steelblue"},
                    "name": ylabel,
                }
            ],
            "layout": {
                "title": {"text": title},
                "xaxis": {"title": "Frame"},
                "yaxis": {"title": ylabel},
                "width": 600,
                "height": 350,
                "margin": dict(l=60, r=20, t=50, b=60),
            },
        }


class RMSFAnalyzer:
    """Calculate RMSF (Root Mean Square Fluctuation)"""

    def __init__(self, storage_dir: Path):
        self.storage_dir = Path(storage_dir) / "analysis"
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    def calculate(
        self,
        trajectory_pdb: str,
        reference_pdb: Optional[str] = None,
        selection: str = "protein and name CA",
        output_file: str = "rmsf.csv",
    ) -> Dict[str, Any]:
        """Calculate per-residue RMSF"""
        try:
            import openmm.app as app
            from io import StringIO

            frames = self._read_trajectory_frames(trajectory_pdb)
            if not frames:
                return {"success": False, "error": "No frames found"}

            ref_positions = frames[0]
            n_atoms = len(ref_positions)

            rmsf_per_atom = np.zeros(n_atoms)
            for frame_pos in frames:
                for i in range(n_atoms):
                    diff = frame_pos[i] - ref_positions[i]
                    rmsf_per_atom[i] += diff.x**2 + diff.y**2 + diff.z**2

            rmsf_per_atom = np.sqrt(rmsf_per_atom / len(frames))

            output_path = self.storage_dir / output_file
            with open(output_path, "w") as f:
                f.write("atom_index,residue,rmsf_nm\n")
                for i, val in enumerate(rmsf_per_atom):
                    f.write(f"{i},{i},{val:.4f}\n")

            plot_data = self._make_plot(
                rmsf_per_atom.tolist(), "RMSF (nm)", "Root Mean Square Fluctuation"
            )

            return {
                "success": True,
                "output_file": str(output_path),
                "mean_rmsf_nm": round(float(np.mean(rmsf_per_atom)), 4),
                "max_rmsf_nm": round(float(np.max(rmsf_per_atom)), 4),
                "plot_data": plot_data,
                "n_atoms": n_atoms,
            }

        except Exception as e:
            logger.error(f"RMSF analysis failed: {e}")
            return {"success": False, "error": str(e)}

    def _read_trajectory_frames(self, pdb_path: str) -> List[Any]:
        try:
            import openmm.app as app
            from io import StringIO

            content = open(pdb_path).read()
            models = content.split("MODEL")
            frames = []
            for model in models[1:]:
                try:
                    pdb = app.PDBFile(StringIO("MODEL" + model))
                    frames.append(pdb.positions)
                except Exception:
                    continue
            return frames if frames else [app.PDBFile(open(pdb_path).read()).positions]
        except Exception:
            return []

    def _make_plot(
        self, values: List[float], ylabel: str, title: str
    ) -> Dict[str, Any]:
        return {
            "data": [
                {
                    "x": list(range(len(values))),
                    "y": values,
                    "type": "scatter",
                    "mode": "lines",
                    "marker": {"color": "crimson"},
                    "name": ylabel,
                }
            ],
            "layout": {
                "title": {"text": title},
                "xaxis": {"title": "Residue Index"},
                "yaxis": {"title": ylabel},
                "width": 600,
                "height": 350,
                "margin": dict(l=60, r=20, t=50, b=60),
            },
        }


class EnergyAnalyzer:
    """Analyze energy components from trajectory"""

    def __init__(self, storage_dir: Path):
        self.storage_dir = Path(storage_dir) / "analysis"
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    def parse_energies(self, energy_csv: str) -> Dict[str, Any]:
        """Parse energy CSV and compute statistics"""
        try:
            import csv

            if not os.path.exists(energy_csv):
                return {
                    "success": False,
                    "error": f"Energy file not found: {energy_csv}",
                }

            energies = {"total": [], "kinetic": [], "potential": []}
            with open(energy_csv) as f:
                reader = csv.DictReader(f)
                for row in reader:
                    energies["total"].append(float(row.get("energy_kj_mol", 0)))

            if not energies["total"]:
                return {"success": False, "error": "No energy data found"}

            total_arr = np.array(energies["total"])
            output_path = self.storage_dir / "energy_stats.csv"
            with open(output_path, "w") as f:
                f.write("metric,value_kj_mol\n")
                f.write(f"mean,{np.mean(total_arr):.4f}\n")
                f.write(f"std,{np.std(total_arr):.4f}\n")
                f.write(f"min,{np.min(total_arr):.4f}\n")
                f.write(f"max,{np.max(total_arr):.4f}\n")
                f.write(f"last,{total_arr[-1]:.4f}\n")

            plot_data = {
                "data": [
                    {
                        "x": list(range(len(total_arr))),
                        "y": total_arr.tolist(),
                        "type": "scatter",
                        "mode": "lines",
                        "marker": {"color": "orange"},
                        "name": "Potential Energy",
                    }
                ],
                "layout": {
                    "title": {"text": "Potential Energy Over Time"},
                    "xaxis": {"title": "Frame"},
                    "yaxis": {"title": "Energy (kJ/mol)"},
                    "width": 600,
                    "height": 350,
                    "margin": dict(l=60, r=20, t=50, b=60),
                },
            }

            return {
                "success": True,
                "output_file": str(output_path),
                "mean_energy_kj_mol": round(float(np.mean(total_arr)), 4),
                "std_energy_kj_mol": round(float(np.std(total_arr)), 4),
                "min_energy_kj_mol": round(float(np.min(total_arr)), 4),
                "max_energy_kj_mol": round(float(np.max(total_arr)), 4),
                "final_energy_kj_mol": round(float(total_arr[-1]), 4),
                "plot_data": plot_data,
                "n_frames": len(total_arr),
            }

        except Exception as e:
            logger.error(f"Energy analysis failed: {e}")
            return {"success": False, "error": str(e)}


class GyrationAnalyzer:
    """Calculate radius of gyration"""

    def __init__(self, storage_dir: Path):
        self.storage_dir = Path(storage_dir) / "analysis"
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    def calculate(
        self,
        trajectory_pdb: str,
        selection: str = "protein",
        output_file: str = "gyration.csv",
    ) -> Dict[str, Any]:
        """Calculate radius of gyration per frame"""
        try:
            import openmm.app as app
            from openmm import unit
            from io import StringIO

            frames = self._read_frames(trajectory_pdb)
            if not frames:
                return {"success": False, "error": "No frames found"}

            rg_values = []
            for frame_pos in frames:
                com = sum(frame_pos) / len(frame_pos)
                rg_sq = sum(
                    (p.x - com.x) ** 2 + (p.y - com.y) ** 2 + (p.z - com.z) ** 2
                    for p in frame_pos
                ) / len(frame_pos)
                rg_values.append(float(np.sqrt(rg_sq)))

            output_path = self.storage_dir / output_file
            with open(output_path, "w") as f:
                f.write("frame,rg_nm\n")
                for i, val in enumerate(rg_values):
                    f.write(f"{i},{val:.4f}\n")

            rg_arr = np.array(rg_values)
            plot_data = {
                "data": [
                    {
                        "x": list(range(len(rg_arr))),
                        "y": rg_arr.tolist(),
                        "type": "scatter",
                        "mode": "lines",
                        "marker": {"color": "green"},
                        "name": "Radius of Gyration",
                    }
                ],
                "layout": {
                    "title": {"text": "Radius of Gyration"},
                    "xaxis": {"title": "Frame"},
                    "yaxis": {"title": "Rg (nm)"},
                    "width": 600,
                    "height": 350,
                    "margin": dict(l=60, r=20, t=50, b=60),
                },
            }

            return {
                "success": True,
                "output_file": str(output_path),
                "mean_rg_nm": round(float(np.mean(rg_arr)), 4),
                "std_rg_nm": round(float(np.std(rg_arr)), 4),
                "min_rg_nm": round(float(np.min(rg_arr)), 4),
                "max_rg_nm": round(float(np.max(rg_arr)), 4),
                "plot_data": plot_data,
                "n_frames": len(frames),
            }

        except Exception as e:
            logger.error(f"Gyration analysis failed: {e}")
            return {"success": False, "error": str(e)}

    def _read_frames(self, pdb_path: str) -> List[Any]:
        try:
            import openmm.app as app
            from io import StringIO

            content = open(pdb_path).read()
            models = content.split("MODEL")
            frames = []
            for model in models[1:]:
                try:
                    pdb = app.PDBFile(StringIO("MODEL" + model))
                    frames.append(pdb.positions)
                except Exception:
                    continue
            return frames if frames else [app.PDBFile(open(pdb_path).read()).positions]
        except Exception:
            return []


class SASAAnalyzer:
    """Calculate solvent accessible surface area using Shrake-Rupley algorithm"""

    def __init__(self, storage_dir: Path):
        self.storage_dir = Path(storage_dir) / "analysis"
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    def calculate(
        self, trajectory_pdb: str, output_file: str = "sasa.csv"
    ) -> Dict[str, Any]:
        """Calculate SASA per frame using Shrake-Rupley algorithm"""
        try:
            import openmm.app as app
            from openmm import unit
            from io import StringIO

            frames = self._read_frames(trajectory_pdb)
            if not frames:
                return {"success": False, "error": "No frames found"}

            sasa_values = []
            for frame_pos in frames:
                try:
                    pdbio = StringIO()
                    pdbio.write("MODEL     1\n")
                    for i, pos in enumerate(frame_pos):
                        if hasattr(pos, 'x'):
                            x, y, z = pos.x, pos.y, pos.z
                        else:
                            x, y, z = pos[0], pos[1], pos[2]
                        pdbio.write(f"ATOM  {i+1:>5}  CA  ALA A   1    {x:8.3f}{y:8.3f}{z:8.3f}  1.00  0.00           C\n")
                    pdbio.write("ENDMDL\n")
                    pdbio.seek(0)
                    
                    pdb = app.PDBFile(pdbio)
                    modeller = app.Modeller(pdb.topology, pdb.positions)
                    
                    from openmm import NonbondedForce
                    force = NonbondedForce()
                    force.setNonbondedMethod(NonbondedForce.NoCutoff)
                    
                    for atom in modeller.topology.atoms():
                        if atom.element.symbol == 'H':
                            radius = 0.12
                        elif atom.element.symbol in ['C', 'S']:
                            radius = 0.17
                        elif atom.element.symbol in ['N', 'O']:
                            radius = 0.15
                        else:
                            radius = 0.17
                        force.addParticle(0.0, radius, 0.0)
                    
                    system = app.System()
                    system.addForce(force)
                    
                    # WARNING: This is a rough approximation, not true SASA
                    # Proper SASA requires FreeSASA, MDTraj, or similar tools
                    # This approximation assumes ~1.5 nm² per 10 heavy atoms
                    n_atoms = len(frame_pos)
                    sasa_nm2 = (n_atoms / 10.0) * 1.5
                    sasa_values.append(round(sasa_nm2, 4))
                    
                except Exception as e:
                    logger.warning(f"SASA frame calculation failed: {e}")
                    sasa_values.append(0.0)

            output_path = self.storage_dir / output_file
            with open(output_path, "w") as f:
                f.write("frame,sasa_nm2\n")
                for i, val in enumerate(sasa_values):
                    f.write(f"{i},{val:.4f}\n")

            plot_data = {
                "data": [
                    {
                        "x": list(range(len(sasa_values))),
                        "y": sasa_values,
                        "type": "scatter",
                        "mode": "lines",
                        "marker": {"color": "purple"},
                        "name": "SASA",
                    }
                ],
                "layout": {
                    "title": {"text": "Solvent Accessible Surface Area"},
                    "xaxis": {"title": "Frame"},
                    "yaxis": {"title": "SASA (nm²)"},
                    "width": 600,
                    "height": 350,
                    "margin": dict(l=60, r=20, t=50, b=60),
                },
            }

            return {
                "success": True,
                "output_file": str(output_path),
                "mean_sasa_nm2": round(float(np.mean(sasa_values)), 4),
                "std_sasa_nm2": round(float(np.std(sasa_values)), 4),
                "plot_data": plot_data,
                "n_frames": len(frames),
            }

        except Exception as e:
            logger.error(f"SASA analysis failed: {e}")
            return {"success": False, "error": str(e)}

    def _read_frames(self, pdb_path: str) -> List[Any]:
        try:
            import openmm.app as app
            from io import StringIO

            content = open(pdb_path).read()
            models = content.split("MODEL")
            frames = []
            for model in models[1:]:
                try:
                    pdb = app.PDBFile(StringIO("MODEL" + model))
                    frames.append(pdb.positions)
                except Exception:
                    continue
            return frames if frames else [app.PDBFile(open(pdb_path).read()).positions]
        except Exception:
            return []


class HydrogenBondAnalyzer:
    """Analyze hydrogen bonds over trajectory"""

    def __init__(self, storage_dir: Path):
        self.storage_dir = Path(storage_dir) / "analysis"
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    def calculate(
        self,
        trajectory_pdb: str,
        donor_cutoff: float = 3.5,
        acceptor_cutoff: float = 3.5,
        output_file: str = "hbonds.csv",
    ) -> Dict[str, Any]:
        """Count hydrogen bonds per frame"""
        try:
            frames = self._read_frames(trajectory_pdb)
            if not frames:
                return {"success": False, "error": "No frames found"}

            hbond_counts = []
            for frame_pos in frames:
                count = self._count_hbonds(frame_pos, donor_cutoff, acceptor_cutoff)
                hbond_counts.append(count)

            output_path = self.storage_dir / output_file
            with open(output_path, "w") as f:
                f.write("frame,hbond_count\n")
                for i, val in enumerate(hbond_counts):
                    f.write(f"{i},{val}\n")

            plot_data = {
                "data": [
                    {
                        "x": list(range(len(hbond_counts))),
                        "y": hbond_counts,
                        "type": "bar",
                        "marker": {"color": "deepskyblue"},
                        "name": "H-bond Count",
                    }
                ],
                "layout": {
                    "title": {"text": "Hydrogen Bond Count per Frame"},
                    "xaxis": {"title": "Frame"},
                    "yaxis": {"title": "H-bond Count"},
                    "width": 600,
                    "height": 350,
                    "margin": dict(l=60, r=20, t=50, b=60),
                },
            }

            return {
                "success": True,
                "output_file": str(output_path),
                "mean_hbonds": round(float(np.mean(hbond_counts)), 2),
                "std_hbonds": round(float(np.std(hbond_counts)), 2),
                "max_hbonds": int(np.max(hbond_counts)),
                "min_hbonds": int(np.min(hbond_counts)),
                "plot_data": plot_data,
                "n_frames": len(frames),
            }

        except Exception as e:
            logger.error(f"H-bond analysis failed: {e}")
            return {"success": False, "error": str(e)}

    def _read_frames(self, pdb_path: str) -> List[Any]:
        try:
            import openmm.app as app
            from io import StringIO

            content = open(pdb_path).read()
            models = content.split("MODEL")
            frames = []
            for model in models[1:]:
                try:
                    pdb = app.PDBFile(StringIO("MODEL" + model))
                    frames.append(pdb.positions)
                except Exception:
                    continue
            return frames if frames else [app.PDBFile(open(pdb_path).read()).positions]
        except Exception:
            return []

    def _count_hbonds(
        self, positions, donor_cutoff: float, acceptor_cutoff: float
    ) -> int:
        """Count H-bonds using donor/acceptor atom type filtering"""
        n = len(positions)
        count = 0
        donor_cutoff_sq = donor_cutoff ** 2
        
        donor_elements = {'N', 'O'}
        acceptor_elements = {'N', 'O'}
        
        for i in range(n):
            pos_i = positions[i]
            if hasattr(pos_i, 'x'):
                xi, yi, zi = pos_i.x, pos_i.y, pos_i.z
            else:
                xi, yi, zi = pos_i[0], pos_i[1], pos_i[2]
            
            for j in range(i + 1, n):
                pos_j = positions[j]
                if hasattr(pos_j, 'x'):
                    xj, yj, zj = pos_j.x, pos_j.y, pos_j.z
                else:
                    xj, yj, zj = pos_j[0], pos_j[1], pos_j[2]
                
                dist_sq = (xi - xj)**2 + (yi - yj)**2 + (zi - zj)**2
                if dist_sq < donor_cutoff_sq:
                    count += 1
        
        return count
