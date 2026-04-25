def check_brackets(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    stack = []
    lines = content.split('\n')
    for i, line in enumerate(lines):
        for char in line:
            if char == '{':
                stack.append(('{', i+1))
            elif char == '}':
                if not stack:
                    print(f"Unmatched '}}' at line {i+1}")
                    return
                stack.pop()
    
    if stack:
        for char, line in stack:
            print(f"Unmatched '{char}' opened at line {line}")
    else:
        print("All brackets match!")

if __name__ == "__main__":
    check_brackets("index.html")
