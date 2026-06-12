---
"@huanglangjian/specs": patch
---

Fix topological sort for generated models to prevent TDZ errors when schemas reference each other out of dependency order.
