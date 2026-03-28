"""
Docking Engine - Actual molecular docking using AutoDock Vina Python API
"""
import os
import logging
import tempfile
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)


def check_vina() -> bool:
    """Check if Vina Python API is available"""
    try:
        from vina import Vina
        return True
    except ImportError:
        return False


def prepare_receptor_file(receptor_path: str) -> Optional[str]:
    """
    Prepare receptor file for Vina docking.
    Vina requires PDBQT files, so we convert if necessary.
    
    Args:
        receptor_path: Path to receptor file
        
    Returns:
        Path to prepared PDBQT file or None if preparation fails
    """
    _, ext = os.path.splitext(receptor_path)
    ext = ext.lower()
    
    if ext == '.pdbqt':
        return receptor_path
    
    # For PDB files, we can try to use the file directly with Vina
    # Vina's Python API can handle PDB files
    if ext == '.pdb':
        return receptor_path
    
    # For other formats, return None (would need obabel for conversion)
    logger.warning(f"Receptor format {ext} not directly supported. PDB or PDBQT required.")
    return None


def prepare_ligand_file(ligand_path: str) -> Optional[str]:
    """
    Prepare ligand file for Vina docking.
    
    Args:
        ligand_path: Path to ligand file
        
    Returns:
        Path to prepared file or None if preparation fails
    """
    _, ext = os.path.splitext(ligand_path)
    ext = ext.lower()
    
    if ext in ['.pdbqt', '.pdb', '.sdf', '.mol2']:
        return ligand_path
    
    logger.warning(f"Ligand format {ext} not supported. PDB, PDBQT, SDF, or MOL2 required.")
    return None


def run_vina_docking(
    receptor_path: str,
    ligand_path: str,
    center_x: float = 0.0,
    center_y: float = 0.0,
    center_z: float = 0.0,
    size_x: float = 20.0,
    size_y: float = 20.0,
    size_z: float = 20.0,
    exhaustiveness: int = 8,
    num_modes: int = 9,
    output_dir: str = "/tmp"
) -> Dict[str, Any]:
    """
    Run AutoDock Vina docking using Python API.
    
    Args:
        receptor_path: Path to receptor PDBQT file
        ligand_path: Path to ligand PDBQT file
        center_x, center_y, center_z: Grid box center coordinates
        size_x, size_y, size_z: Grid box dimensions
        exhaustiveness: Search exhaustiveness (1-32)
        num_modes: Number of binding modes to generate
        output_dir: Directory for output files
        
    Returns:
        Dictionary with docking results
    """
    try:
        from vina import Vina
    except ImportError:
        logger.error("Vina not installed")
        return {
            "success": False,
            "error": "Vina Python package not installed",
            "results": []
        }
    
    # Prepare files
    receptor_file = prepare_receptor_file(receptor_path)
    ligand_file = prepare_ligand_file(ligand_path)
    
    if receptor_file is None:
        return {
            "success": False,
            "error": f"Failed to prepare receptor: {receptor_path}",
            "results": []
        }
    
    if ligand_file is None:
        return {
            "success": False,
            "error": f"Failed to prepare ligand: {ligand_path}",
            "results": []
        }
    
    try:
        # Initialize Vina
        logger.info("Initializing Vina...")
        v = Vina(sf_name='vina')
        
        # Set receptor
        logger.info(f"Setting receptor from: {receptor_file}")
        try:
            v.set_receptor(rigid_pdbqt_filename=receptor_file)
        except Exception as e:
            logger.error(f"Failed to set receptor: {e}")
            return {
                "success": False,
                "error": f"Failed to set receptor: {str(e)}",
                "results": []
            }
        
        # Set ligand
        logger.info(f"Setting ligand from: {ligand_file}")
        try:
            v.set_ligand_from_file(ligand_file)
        except Exception as e:
            logger.error(f"Failed to set ligand: {e}")
            return {
                "success": False,
                "error": f"Failed to set ligand: {str(e)}",
                "results": []
            }
        
        # Set search space (grid box)
        logger.info(f"Setting box center: ({center_x}, {center_y}, {center_z}), size: ({size_x}, {size_y}, {size_z})")
        try:
            v.compute_vina_maps(center=[center_x, center_y, center_z], box_size=[size_x, size_y, size_z])
        except Exception as e:
            logger.error(f"Failed to compute Vina maps: {e}")
            return {
                "success": False,
                "error": f"Failed to compute Vina maps: {str(e)}",
                "results": []
            }
        
        # Run docking
        logger.info(f"Running docking with exhaustiveness={exhaustiveness}, num_modes={num_modes}")
        try:
            v.dock(exhaustiveness=exhaustiveness, n_poses=num_modes)
        except Exception as e:
            logger.error(f"Docking failed: {e}")
            return {
                "success": False,
                "error": f"Docking failed: {str(e)}",
                "results": []
            }
        
        # Get energies and poses
        try:
            energies = v.energies
            logger.info(f"Docking completed. Best score: {energies[0][0] if energies else 'N/A'}")
        except Exception as e:
            logger.warning(f"Could not get energies: {e}")
            energies = []
        
        # Build results from poses
        results = []
        try:
            poses = v.poses(n_poses=num_modes, coordinates_only=False)
            for i, pose in enumerate(poses):
                energy = float(energies[i][0]) if i < len(energies) else 0.0
                results.append({
                    "pose_id": i + 1,
                    "vina_score": energy,
                    "gnina_score": None,
                    "rf_score": None
                })
        except Exception as e:
            logger.debug(f"Could not get poses: {e}")
        
        # Write output file
        os.makedirs(output_dir, exist_ok=True)
        output_file = os.path.join(output_dir, "vina_results.pdbqt")
        try:
            v.write_pose(output_file, overwrite=True)
            logger.info(f"Results written to: {output_file}")
        except Exception as e:
            logger.warning(f"Could not write output file: {e}")
        
        return {
            "success": True,
            "engine": "vina",
            "results": results,
            "output_file": output_file if os.path.exists(output_file) else None
        }
        
    except Exception as e:
        logger.error(f"Vina docking error: {e}")
        return {
            "success": False,
            "error": str(e),
            "results": []
        }


def run_docking(
    receptor_path: str,
    ligand_path: str,
    engine: str = "vina",
    center_x: float = 0.0,
    center_y: float = 0.0,
    center_z: float = 0.0,
    size_x: float = 20.0,
    size_y: float = 20.0,
    size_z: float = 20.0,
    exhaustiveness: int = 8,
    num_modes: int = 9,
    output_dir: str = "/tmp"
) -> Dict[str, Any]:
    """
    Main docking function.
    
    Args:
        receptor_path: Path to receptor file
        ligand_path: Path to ligand file
        engine: Docking engine ('vina' currently supported)
        center_x, center_y, center_z: Grid box center
        size_x, size_y, size_z: Grid box size
        exhaustiveness: Search exhaustiveness
        num_modes: Number of binding modes
        output_dir: Output directory
        
    Returns:
        Dictionary with docking results
    """
    if engine.lower() == "vina":
        return run_vina_docking(
            receptor_path, ligand_path,
            center_x, center_y, center_z,
            size_x, size_y, size_z,
            exhaustiveness, num_modes, output_dir
        )
    
    return {
        "success": False,
        "error": f"Unknown engine: {engine}. Only 'vina' is currently supported.",
        "results": []
    }
