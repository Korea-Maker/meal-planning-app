'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, ChefHat, Link2 } from 'lucide-react'
import { URLImportDialog } from '@/components/recipes/url-import-dialog'

export function RecipeSpeedDial() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Speed Dial Container */}
      <div className="fixed bottom-24 sm:bottom-6 right-6 z-50 flex flex-col-reverse items-end gap-3">
        {/* Sub Menu Items */}
        {open && (
          <>
            {/* New Recipe */}
            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="bg-white shadow-lg rounded-full px-3 py-1.5">
                <span className="text-sm font-medium whitespace-nowrap">새 레시피</span>
              </div>
              <Link
                href="/recipes/new"
                className="w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow"
                onClick={() => setOpen(false)}
              >
                <ChefHat className="h-5 w-5 text-primary" />
              </Link>
            </div>

            {/* URL Import */}
            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="bg-white shadow-lg rounded-full px-3 py-1.5">
                <span className="text-sm font-medium whitespace-nowrap">URL에서 가져오기</span>
              </div>
              <URLImportDialog
                trigger={
                  <button
                    className="w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow"
                    onClick={() => setOpen(false)}
                  >
                    <Link2 className="h-5 w-5 text-primary" />
                  </button>
                }
              />
            </div>
          </>
        )}

        {/* Main FAB */}
        <button
          onClick={() => setOpen(!open)}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-primary to-accent shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
        >
          <Plus className={`h-6 w-6 text-white transition-transform duration-200 ${open ? 'rotate-45' : ''}`} />
        </button>
      </div>
    </>
  )
}
