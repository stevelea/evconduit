#!/usr/bin/env python3
"""
Project Renaming Script for EVLinkHA Fork

This script helps rename the EVLinkHA project to a new name,
updating all references across the codebase.

Usage:
    python rename_project.py --old-name evlinkha --new-name my-ev-bridge
"""

import os
import re
import argparse
from pathlib import Path
from typing import List, Tuple


class ProjectRenamer:
    def __init__(self, old_name: str, new_name: str, root_dir: str = "."):
        self.old_name = old_name.lower()
        self.new_name = new_name.lower()
        self.old_name_title = old_name.title().replace("-", "").replace("_", "")
        self.new_name_title = new_name.title().replace("-", "").replace("_", "")
        self.root_dir = Path(root_dir)
        
        # Files to skip
        self.skip_dirs = {".git", "node_modules", "__pycache__", ".next", "dist", "build", ".cache"}
        self.skip_files = {".pyc", ".pyo", ".pyd", ".so", ".dll"}
        
        # Track changes
        self.files_modified = []
        self.files_renamed = []

    def should_skip(self, path: Path) -> bool:
        """Check if path should be skipped."""
        # Skip directories
        if any(skip_dir in path.parts for skip_dir in self.skip_dirs):
            return True
        
        # Skip by extension
        if path.suffix in self.skip_files:
            return True
            
        # Skip binary files
        binary_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.zip'}
        if path.suffix.lower() in binary_extensions:
            return True
            
        return False

    def get_text_files(self) -> List[Path]:
        """Get all text files that should be processed."""
        text_extensions = {
            '.md', '.py', '.js', '.jsx', '.ts', '.tsx', '.json', '.yml', '.yaml',
            '.txt', '.sh', '.env', '.example', '.toml', '.ini', '.cfg', '.conf',
            '.html', '.css', '.scss', '.sql', '.xml'
        }
        
        text_files = []
        for path in self.root_dir.rglob("*"):
            if path.is_file() and not self.should_skip(path):
                if path.suffix in text_extensions or path.name in {'.env.example', 'Dockerfile', 'Makefile'}:
                    text_files.append(path)
        
        return text_files

    def replace_in_file(self, file_path: Path) -> bool:
        """Replace old name with new name in a file."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except UnicodeDecodeError:
            # Skip binary files
            return False
        
        original_content = content
        
        # Replace variations of the name
        replacements = [
            (self.old_name, self.new_name),
            (self.old_name.upper(), self.new_name.upper()),
            (self.old_name_title, self.new_name_title),
            (self.old_name.replace("-", "_"), self.new_name.replace("-", "_")),
            (self.old_name.replace("_", "-"), self.new_name.replace("_", "-")),
            ("evlinkha.se", f"{self.new_name}.com"),  # Update domain
            ("EVLinkHA", self.new_name_title),
            ("evlink-backend", f"{self.new_name}-backend"),
        ]
        
        for old, new in replacements:
            content = content.replace(old, new)
        
        # Write back if changed
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        
        return False

    def rename_files_and_dirs(self) -> None:
        """Rename files and directories containing the old name."""
        # Get all paths (files and directories)
        all_paths = sorted(self.root_dir.rglob("*"), key=lambda p: len(p.parts), reverse=True)
        
        for path in all_paths:
            if self.should_skip(path):
                continue
                
            # Check if name contains old project name
            if self.old_name in path.name.lower():
                new_name = path.name.replace(self.old_name, self.new_name)
                new_path = path.parent / new_name
                
                try:
                    path.rename(new_path)
                    self.files_renamed.append((str(path), str(new_path)))
                    print(f"✓ Renamed: {path} → {new_path}")
                except Exception as e:
                    print(f"✗ Error renaming {path}: {e}")

    def update_package_json(self) -> None:
        """Update package.json files specifically."""
        package_files = list(self.root_dir.rglob("package.json"))
        
        for pkg_file in package_files:
            if self.should_skip(pkg_file):
                continue
                
            try:
                import json
                with open(pkg_file, 'r') as f:
                    data = json.load(f)
                
                # Update name field
                if 'name' in data and self.old_name in data['name'].lower():
                    old_value = data['name']
                    data['name'] = self.new_name
                    print(f"✓ Updated package.json name: {old_value} → {data['name']}")
                
                # Update description
                if 'description' in data:
                    data['description'] = data['description'].replace('EVLinkHA', self.new_name_title)
                
                # Write back
                with open(pkg_file, 'w') as f:
                    json.dump(data, f, indent=2)
                    f.write('\n')  # Add trailing newline
                    
            except Exception as e:
                print(f"✗ Error updating {pkg_file}: {e}")

    def create_env_example(self) -> None:
        """Create .env.example from docker-compose.yml comments."""
        docker_compose = self.root_dir / "docker-compose.yml"
        env_example = self.root_dir / ".env.example"
        
        if not docker_compose.exists():
            return
        
        env_vars = []
        env_vars.append("# Backend Environment Variables")
        env_vars.append("SUPABASE_URL=https://your-project.supabase.co")
        env_vars.append("SUPABASE_SERVICE_ROLE_KEY=your_service_role_key")
        env_vars.append("SUPABASE_ANON_KEY=your_anon_key")
        env_vars.append("INTERNAL_API_KEY=generate_strong_random_key")
        env_vars.append("BREVO_API_KEY=your_brevo_api_key")
        env_vars.append("FROM_EMAIL=noreply@yourdomain.com")
        env_vars.append("FROM_NAME=Your Project Name")
        env_vars.append("TWILIO_ACCOUNT_SID=your_account_sid")
        env_vars.append("TWILIO_AUTH_TOKEN=your_auth_token")
        env_vars.append("TWILIO_PHONE_NUMBER=+1234567890")
        env_vars.append("STRIPE_SECRET_KEY=sk_test_...")
        env_vars.append("STRIPE_PUBLISHABLE_KEY=pk_test_...")
        env_vars.append("STRIPE_WEBHOOK_SECRET=whsec_...")
        env_vars.append("SENTRY_DSN=https://...@sentry.io/...")
        env_vars.append("PYTHONUNBUFFERED=1")
        env_vars.append("TZ=UTC")
        env_vars.append("")
        env_vars.append("# Frontend Environment Variables")
        env_vars.append("NODE_ENV=production")
        env_vars.append("NEXT_TELEMETRY_DISABLED=1")
        env_vars.append(f"NEXT_PUBLIC_API_BASE_URL=https://api.{self.new_name}.com")
        env_vars.append("NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co")
        env_vars.append("NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key")
        env_vars.append("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...")
        env_vars.append("NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...")
        
        with open(env_example, 'w') as f:
            f.write('\n'.join(env_vars) + '\n')
        
        print(f"✓ Created {env_example}")

    def generate_summary(self) -> str:
        """Generate a summary of changes."""
        summary = []
        summary.append(f"\n{'='*60}")
        summary.append(f"Project Rename Summary: {self.old_name} → {self.new_name}")
        summary.append(f"{'='*60}\n")
        
        summary.append(f"Files modified: {len(self.files_modified)}")
        summary.append(f"Files/directories renamed: {len(self.files_renamed)}\n")
        
        if self.files_renamed:
            summary.append("Renamed files/directories:")
            for old, new in self.files_renamed[:10]:  # Show first 10
                summary.append(f"  {old} → {new}")
            if len(self.files_renamed) > 10:
                summary.append(f"  ... and {len(self.files_renamed) - 10} more")
        
        summary.append(f"\n{'='*60}")
        summary.append("Next Steps:")
        summary.append("1. Review changes with: git diff")
        summary.append("2. Update environment variables in .env")
        summary.append("3. Update domain references")
        summary.append("4. Test locally with docker-compose")
        summary.append("5. Set up external services (Supabase, Stripe, etc.)")
        summary.append(f"{'='*60}\n")
        
        return '\n'.join(summary)

    def run(self, dry_run: bool = False) -> None:
        """Run the renaming process."""
        print(f"Starting project rename: {self.old_name} → {self.new_name}")
        print(f"Root directory: {self.root_dir.absolute()}\n")
        
        if dry_run:
            print("DRY RUN MODE - No changes will be made\n")
        
        # Step 1: Replace in text files
        print("Step 1: Updating file contents...")
        text_files = self.get_text_files()
        for file_path in text_files:
            if not dry_run:
                if self.replace_in_file(file_path):
                    self.files_modified.append(str(file_path))
                    print(f"✓ Updated: {file_path}")
            else:
                print(f"  Would update: {file_path}")
        
        # Step 2: Update package.json files
        print("\nStep 2: Updating package.json files...")
        if not dry_run:
            self.update_package_json()
        else:
            print("  Would update package.json files")
        
        # Step 3: Create .env.example
        print("\nStep 3: Creating .env.example...")
        if not dry_run:
            self.create_env_example()
        else:
            print("  Would create .env.example")
        
        # Step 4: Rename files and directories
        print("\nStep 4: Renaming files and directories...")
        if not dry_run:
            self.rename_files_and_dirs()
        else:
            print("  Would rename files/directories containing old name")
        
        # Summary
        if not dry_run:
            print(self.generate_summary())


def main():
    parser = argparse.ArgumentParser(
        description='Rename EVLinkHA project to a new name',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Examples:
  python rename_project.py --old-name evlinkha --new-name my-ev-bridge
  python rename_project.py --old-name evlinkha --new-name homeassistant-ev --dry-run
        '''
    )
    
    parser.add_argument('--old-name', default='evlinkha', help='Old project name (default: evlinkha)')
    parser.add_argument('--new-name', required=True, help='New project name')
    parser.add_argument('--root-dir', default='.', help='Root directory of project (default: current directory)')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be changed without making changes')
    
    args = parser.parse_args()
    
    # Validate new name
    if not re.match(r'^[a-z0-9-]+$', args.new_name):
        print("Error: New name should only contain lowercase letters, numbers, and hyphens")
        return 1
    
    renamer = ProjectRenamer(args.old_name, args.new_name, args.root_dir)
    renamer.run(dry_run=args.dry_run)
    
    return 0


if __name__ == "__main__":
    exit(main())
