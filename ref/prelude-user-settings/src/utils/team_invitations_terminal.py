#!/usr/bin/env python3
"""
Team Invitations Terminal - Interactive Database Management
"""

import sys
from database_reader import DatabaseReader
from datetime import datetime

class TeamInvitationsTerminal:
    def __init__(self):
        self.reader = DatabaseReader()
        print("="*60)
        print(" TEAM INVITATIONS TERMINAL")
        print(" Connected to: prelude_user_analytics")
        print("="*60)
        
    def show_menu(self):
        """Display the main menu."""
        print("\n" + "="*60)
        print(" MAIN MENU")
        print("="*60)
        print("1.  View All Tables")
        print("2.  View All Users")
        print("3.  View Companies Summary")
        print("4.  Search User by Email")
        print("5.  View Users by Company")
        print("6.  View Database Usage")
        print("7.  Add New User")
        print("8.  Update User Information")
        print("9.  Remove User")
        print("10. Export Data to JSON")
        print("11. View User Analytics")
        print("12. View Module Usage")
        print("0.  Exit")
        print("-"*60)
        
    def view_tables(self):
        """View all database tables."""
        tables = self.reader.get_all_tables()
        print(f"\n[TABLE] Database Tables ({len(tables)} total)")
        print("="*60)
        for i, table in enumerate(tables, 1):
            count = self.reader.get_table_row_count(table)
            print(f"  {i}. {table:<30} [{count:>5} rows]")
            
    def view_users(self):
        """View all users with detailed information."""
        users = self.reader.get_all_users(limit=None)
        total = self.reader.get_table_row_count('user_profiles')
        
        print(f"\n[USERS] All Users ({len(users)} of {total} total)")
        print("="*60)
        print(f"{'Email':<35} {'Name':<20} {'Company':<20} {'Role':<15}")
        print("-"*60)
        
        for user in users:
            email = user['email'][:35] if user['email'] else 'N/A'
            name = user['name'][:20] if user['name'] else 'N/A'
            company = user['company'][:20] if user['company'] else 'N/A'
            role = user['role'][:15] if user['role'] else 'N/A'
            print(f"{email:<35} {name:<20} {company:<20} {role:<15}")
            
    def view_companies(self):
        """View companies summary."""
        companies = self.reader.get_companies()
        
        print(f"\n[COMPANIES] Companies Summary ({len(companies)} companies)")
        print("="*60)
        print(f"{'Company':<40} {'User Count':<15}")
        print("-"*60)
        
        for company in companies:
            comp_name = company['company'] if company['company'] else 'Unknown'
            print(f"{comp_name:<40} {company['user_count']:<15}")
            
    def search_user(self):
        """Search for a specific user."""
        print("\n[SEARCH] Search User by Email")
        print("Example emails: mark@preludeos.com, test_user@preludeos.com")
        # Simulating search for mark@preludeos.com
        email = "mark@preludeos.com"
        print(f"Searching for: {email}")
        
        user = self.reader.get_user_by_email(email)
        if user:
            print(f"\n[FOUND] User Found: {email}")
            print("="*60)
            for key, value in user.items():
                if value is not None:
                    if isinstance(value, datetime):
                        value = value.strftime("%Y-%m-%d %H:%M:%S")
                    print(f"  {key:<15}: {value}")
        else:
            print(f"[NOT FOUND] User '{email}' not found")
            
    def view_analytics(self):
        """View user analytics data."""
        # Get recent analytics
        query = """
            SELECT ua.*, up.email, up.name 
            FROM user_analytics ua
            LEFT JOIN user_profiles up ON ua.user_id = up.id
            ORDER BY ua.timestamp DESC
            LIMIT 10
        """
        analytics = self.reader.execute_query(query)
        
        print(f"\n[ANALYTICS] Recent User Analytics (Last 10 entries)")
        print("="*60)
        
        for record in analytics:
            print(f"User: {record.get('email', 'Unknown')}")
            print(f"  Module: {record.get('module_name', 'N/A')}")
            print(f"  Action: {record.get('action', 'N/A')}")
            print(f"  Time: {record.get('timestamp', 'N/A')}")
            print("-"*30)
            
    def view_module_usage(self):
        """View module usage summary."""
        query = """
            SELECT module_name, 
                   COUNT(DISTINCT user_id) as unique_users,
                   COUNT(*) as total_actions,
                   MAX(last_accessed) as last_used
            FROM module_usage_summary
            GROUP BY module_name
            ORDER BY total_actions DESC
        """
        usage = self.reader.execute_query(query)
        
        print(f"\n[MODULES] Module Usage Summary")
        print("="*60)
        print(f"{'Module':<30} {'Unique Users':<15} {'Total Actions':<15}")
        print("-"*60)
        
        for module in usage:
            mod_name = module.get('module_name', 'Unknown')[:30]
            users = module.get('unique_users', 0)
            actions = module.get('total_actions', 0)
            print(f"{mod_name:<30} {users:<15} {actions:<15}")
            
    def run(self):
        """Run the terminal in demo mode."""
        print("\n[LAUNCH] Launching Team Invitations Terminal...")
        
        # Demo sequence
        actions = [
            ("Viewing all tables", self.view_tables),
            ("Viewing all users", self.view_users),
            ("Viewing companies summary", self.view_companies),
            ("Searching for user", self.search_user),
            ("Viewing user analytics", self.view_analytics),
            ("Viewing module usage", self.view_module_usage)
        ]
        
        for description, action in actions:
            print(f"\n[RUNNING] {description}...")
            try:
                action()
            except Exception as e:
                print(f"[ERROR] Error: {e}")
                
        print("\n" + "="*60)
        print(" [COMPLETE] Team Invitations Terminal Demo Complete")
        print("="*60)
        print("\nTo use interactively, you can:")
        print("  - Run: python quick_viewer.py [command]")
        print("  - Or modify this script for specific operations")
        
    def close(self):
        """Close the database connection."""
        self.reader.close()
        print("\n[CLOSED] Database connection closed")

def main():
    terminal = TeamInvitationsTerminal()
    try:
        terminal.run()
    except KeyboardInterrupt:
        print("\n\n[WARNING] Interrupted by user")
    except Exception as e:
        print(f"\n[ERROR] Error: {e}")
    finally:
        terminal.close()

if __name__ == "__main__":
    main()