import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@/i18n/config'
import { ManageCategoryRecordsModal } from '../components/ManageCategoryRecordsModal'
import { categoryRecordRepository } from '@/repositories/categoryRecordRepository'

describe('ManageCategoryRecordsModal Component', () => {
  const mockOnClose = vi.fn()
  const mockOnRecordsChanged = vi.fn()

  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    vi.spyOn(window, 'confirm').mockImplementation(() => true)
  })

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <ManageCategoryRecordsModal
        isOpen={false}
        onClose={mockOnClose}
        categoryId="cat-test"
        categoryName="Activities"
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders modal with category name, header, and month selector', async () => {
    await act(async () => {
      render(
        <ManageCategoryRecordsModal
          isOpen={true}
          onClose={mockOnClose}
          categoryId="cat-trip"
          categoryName="Weekend Trip"
          initialMonth="2026-11"
        />
      )
    })

    expect(screen.getByText('Weekend Trip')).toBeDefined()
    expect(screen.getByText(/2026/)).toBeDefined()
  })

  it('allows adding, editing, and deleting a record', async () => {
    await act(async () => {
      render(
        <ManageCategoryRecordsModal
          isOpen={true}
          onClose={mockOnClose}
          categoryId="cat-trip"
          categoryName="Weekend Trip"
          initialMonth="2026-11"
          onRecordsChanged={mockOnRecordsChanged}
        />
      )
    })

    // Form inputs via data-testid
    const nameInput = screen.getByTestId('record-name-input')
    const amountInput = screen.getByTestId('record-amount-input')
    const submitBtn = screen.getByTestId('record-submit-btn')

    // 1. Add record
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'Camping Gear' } })
      fireEvent.change(amountInput, { target: { value: '450000' } })
      fireEvent.click(submitBtn)
    })

    await waitFor(() => {
      expect(screen.getByText('Camping Gear')).toBeDefined()
    })
    expect(mockOnRecordsChanged).toHaveBeenCalled()

    // Retrieve added record to find its id
    const stored = await categoryRecordRepository.findByCategoryId('cat-trip')
    expect(stored.length).toBeGreaterThanOrEqual(1)
    const recordId = stored[0].id

    // 2. Edit record
    const editBtn = screen.getByTestId(`record-edit-${recordId}`)
    await act(async () => {
      fireEvent.click(editBtn)
    })

    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'Camping Tent' } })
      fireEvent.click(submitBtn)
    })

    await waitFor(() => {
      expect(screen.getByText('Camping Tent')).toBeDefined()
    })

    // 3. Delete record
    const deleteBtn = screen.getByTestId(`record-delete-${recordId}`)
    await act(async () => {
      fireEvent.click(deleteBtn)
    })

    await waitFor(() => {
      expect(screen.queryByText('Camping Tent')).toBeNull()
    })
  })
})
