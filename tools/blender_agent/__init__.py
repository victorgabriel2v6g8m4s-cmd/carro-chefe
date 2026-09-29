"""Carro Chefe Blender Agent bridge.

Core modules avoid importing bpy so protocol, client and security checks can be
validated outside Blender and in CI.
"""

__all__ = ["protocol"]
