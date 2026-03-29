"""
Publication Packager - Creates publication-ready packages
Adapted from MD-Suite core/publication_packager.py
"""

import os
import json
import logging
import zipfile
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger("md-publication")


class PublicationPackager:
    """
    Creates a publication-ready ZIP package from MD simulation results.
    Includes trajectory, final structure, energy data, analysis, and metadata.
    """

    def __init__(self, project_id: str, storage_dir: Path):
        self.project_id = project_id
        self.storage_dir = Path(storage_dir) / "publications" / project_id
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    def create_package(
        self,
        job_id: str,
        analysis_results: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict] = None,
        compress: bool = True,
    ) -> Dict[str, Any]:
        """
        Create publication package from job results.

        Args:
            job_id: MD simulation job ID
            analysis_results: Dict of analysis results (rmsd, rmsf, energy, etc.)
            metadata: Simulation metadata
            compress: Whether to create ZIP archive

        Returns:
            Package info including path and file list
        """
        try:
            storage = Path(self.storage_dir).parent.parent
            job_dir = storage
            package_dir = self.storage_dir

            os.makedirs(package_dir, exist_ok=True)

            files_copied = []
            missing_files = []

            file_map = {
                f"trajectory_{job_id}.pdb": "trajectory.pdb",
                f"frame_last_{job_id}.pdb": "final_frame.pdb",
                f"energies_{job_id}.csv": "energies.csv",
            }
            for src_name, dest_name in file_map.items():
                src = job_dir / src_name
                if src.exists():
                    import shutil

                    shutil.copy2(src, package_dir / dest_name)
                    files_copied.append(dest_name)
                else:
                    missing_files.append(src_name)

            if analysis_results:
                analysis_dir = package_dir / "analysis"
                os.makedirs(analysis_dir, exist_ok=True)
                analysis_meta = {}
                for name, result in analysis_results.items():
                    if isinstance(result, dict) and result.get("success"):
                        summary = {
                            k: v
                            for k, v in result.items()
                            if k not in ("plot_data", "output_file")
                        }
                        analysis_meta[name] = summary
                with open(analysis_dir / "analysis_summary.json", "w") as f:
                    json.dump(analysis_meta, f, indent=2)

            readme = self._generate_readme(
                job_id=job_id, files=files_copied, metadata=metadata
            )
            with open(package_dir / "README_reproducibility.txt", "w") as f:
                f.write(readme)

            meta = self._generate_metadata(
                job_id=job_id,
                files=files_copied,
                missing=missing_files,
                user_metadata=metadata,
            )
            with open(package_dir / "simulation_metadata.json", "w") as f:
                json.dump(meta, f, indent=2)

            package_path = str(package_dir)
            if compress:
                zip_path = f"{package_dir}.zip"
                with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
                    for root, dirs, files in os.walk(package_dir):
                        for file in files:
                            fp = os.path.join(root, file)
                            arcname = os.path.relpath(fp, os.path.dirname(package_dir))
                            zf.write(fp, arcname)
                package_path = zip_path

            return {
                "success": True,
                "package_path": package_path,
                "package_type": "zip" if compress else "directory",
                "files_included": files_copied,
                "files_missing": missing_files,
                "created_at": datetime.now().isoformat(),
            }

        except Exception as e:
            logger.error(f"Publication package creation failed: {e}")
            return {"success": False, "error": str(e)}

    def _generate_readme(
        self, job_id: str, files: List[str], metadata: Optional[Dict]
    ) -> str:
        lines = [
            "=" * 60,
            "Docking Studio MD Simulation - Publication Package",
            "=" * 60,
            f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            f"Job ID: {job_id}",
            "",
            "CONTENTS",
            "-" * 60,
        ]
        for f in files:
            lines.append(f"  - {f}")
        lines.extend(
            [
                "",
                "ANALYSIS INCLUDED",
                "-" * 60,
                "  This package includes pre-computed analysis:",
                "  - RMSD (Root Mean Square Deviation)",
                "  - RMSF (Root Mean Square Fluctuation)",
                "  - Energy trajectories",
                "  - Radius of gyration",
                "  - Hydrogen bond analysis",
                "",
                "HOW TO REPRODUCE",
                "-" * 60,
                "  This simulation was run using OpenMM (CPU-based).",
                "  To reproduce:",
                "  1. Load the final PDB structure",
                "  2. Configure MD parameters (temperature, solvent, etc.)",
                "  3. Run the same simulation using the analysis settings",
                "",
                "SYSTEM INFO",
                "-" * 60,
            ]
        )
        if metadata:
            for k, v in metadata.items():
                lines.append(f"  {k}: {v}")
        lines.extend(
            [
                "",
                "---",
                "Generated by Docking Studio MD-Suite (OpenMM)",
            ]
        )
        return "\n".join(lines)

    def _generate_metadata(
        self,
        job_id: str,
        files: List[str],
        missing: List[str],
        user_metadata: Optional[Dict],
    ) -> Dict[str, Any]:
        return {
            "generator": "Docking Studio MD-Suite",
            "version": "2.0.0",
            "created": datetime.now().isoformat(),
            "job_id": job_id,
            "files": files,
            "missing_files": missing,
            "simulation": user_metadata or {},
        }
