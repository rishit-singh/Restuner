class ReplicateMessage:
    __slots__ = ("Role", "Content")

    def __init__(self, role: str, content: str):
        self.Role: str = role
        self.Content: str = content

    def __str__(self) -> str:
        if (self.Role == "user"):
            return f"[INST] {self.Content} [/INST]"
        return self.Content

