import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@/i18n/config'
import { ManageFixedBillsModal } from '../components/ManageFixedBillsModal'
import type { FixedBillItem } from '../types'

describe('ManageFixedBillsModal Component', () => {
  const initialBills: FixedBillItem[] = [
    {
      id: 'fb-1',
      name: 'Tiền nhà',
      amountVnd: 1500000,
      paymentHistory: {
        '2026-10': { status: 'PAID', paidAt: '2026-10-05T10:00:00.000Z' },
      },
    },
    {
      id: 'fb-2',
      name: 'Wifi Internet',
      amountVnd: 300000,
      paymentHistory: {},
    },
  ]

  const mockOnClose = vi.fn()
  const mockOnSaveBills = vi.fn()
  const monthlyIncome = 10000000 // 10M VND

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <ManageFixedBillsModal
        isOpen={false}
        onClose={mockOnClose}
        bills={initialBills}
        onSaveBills={mockOnSaveBills}
        monthlyIncome={monthlyIncome}
      />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders modal with initial bills, summary, and default billing period', () => {
    render(
      <ManageFixedBillsModal
        isOpen={true}
        onClose={mockOnClose}
        bills={initialBills}
        onSaveBills={mockOnSaveBills}
        monthlyIncome={monthlyIncome}
        initialMonth="2026-11"
      />,
    )

    // Month Selector displays November 2026
    expect(screen.getByText(/2026/)).toBeDefined()

    // Bill names are rendered
    expect(screen.getByText('Tiền nhà')).toBeDefined()
    expect(screen.getByText('Wifi Internet')).toBeDefined()

    // In 2026-11, both bills are UNPAID by default
    const unpaidBadges = screen.getAllByText(/chưa thanh toán|unpaid/i)
    expect(unpaidBadges.length).toBeGreaterThanOrEqual(2)

    // Total fixed bills: 1,800,000 VND, RATE: 18% (1.8M / 10M)
    expect(screen.getByText(/18%/)).toBeDefined()
  })

  it('marks a bill as PAID on checkbox click and calls onSaveBills with updated history', () => {
    render(
      <ManageFixedBillsModal
        isOpen={true}
        onClose={mockOnClose}
        bills={initialBills}
        onSaveBills={mockOnSaveBills}
        monthlyIncome={monthlyIncome}
        initialMonth="2026-11"
      />,
    )

    // Find checkbox toggle buttons
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes.length).toBe(2)

    // Toggle the first bill (Tiền nhà)
    fireEvent.click(checkboxes[0])

    expect(mockOnSaveBills).toHaveBeenCalledTimes(1)
    const savedBills: FixedBillItem[] = mockOnSaveBills.mock.calls[0][0]
    const updatedRent = savedBills.find((b) => b.id === 'fb-1')
    expect(updatedRent?.paymentHistory?.['2026-11']?.status).toBe('PAID')
    expect(updatedRent?.paymentHistory?.['2026-11']?.paidAt).toBeDefined()

    // Verify historical payment in 2026-10 is preserved!
    expect(updatedRent?.paymentHistory?.['2026-10']?.status).toBe('PAID')
  })

  it('reverts PAID bill to UNPAID when clicked again', () => {
    const paidBills: FixedBillItem[] = [
      {
        id: 'fb-1',
        name: 'Tiền nhà',
        amountVnd: 1500000,
        paymentHistory: {
          '2026-11': { status: 'PAID', paidAt: '2026-11-01T00:00:00.000Z' },
        },
      },
    ]

    render(
      <ManageFixedBillsModal
        isOpen={true}
        onClose={mockOnClose}
        bills={paidBills}
        onSaveBills={mockOnSaveBills}
        monthlyIncome={monthlyIncome}
        initialMonth="2026-11"
      />,
    )

    const checkbox = screen.getByRole('checkbox')
    expect(checkbox.getAttribute('aria-checked')).toBe('true')

    fireEvent.click(checkbox)

    expect(mockOnSaveBills).toHaveBeenCalledTimes(1)
    const savedBills: FixedBillItem[] = mockOnSaveBills.mock.calls[0][0]
    expect(savedBills[0].paymentHistory?.['2026-11']?.status).toBe('UNPAID')
    expect(savedBills[0].paymentHistory?.['2026-11']?.paidAt).toBeNull()
  })

  it('tracks payment independently per month when switching billing period', () => {
    render(
      <ManageFixedBillsModal
        isOpen={true}
        onClose={mockOnClose}
        bills={initialBills}
        onSaveBills={mockOnSaveBills}
        monthlyIncome={monthlyIncome}
        initialMonth="2026-11"
      />,
    )

    // In 2026-11, Tiền nhà is UNPAID
    const checkboxRent = screen.getAllByRole('checkbox')[0]
    expect(checkboxRent.getAttribute('aria-checked')).toBe('false')

    // Click Previous Month button (<) to go to 2026-10
    const prevBtn = screen.getByLabelText(/tháng trước|previous month/i)
    fireEvent.click(prevBtn)

    // In 2026-10, Tiền nhà should show as PAID (from initialBills history)
    const checkboxRentOct = screen.getAllByRole('checkbox')[0]
    expect(checkboxRentOct.getAttribute('aria-checked')).toBe('true')

    // Click Next Month button (>) twice to go to 2026-12
    const nextBtn = screen.getByLabelText(/tháng sau|next month/i)
    fireEvent.click(nextBtn) // back to 2026-11
    fireEvent.click(nextBtn) // now 2026-12

    // In 2026-12, no history exists -> defaults to UNPAID (never copied from 2026-10 or 2026-11)
    const checkboxRentDec = screen.getAllByRole('checkbox')[0]
    expect(checkboxRentDec.getAttribute('aria-checked')).toBe('false')
  })

  it('filters bill list by All, Unpaid, and Paid without altering summary calculation', () => {
    const mixedBills: FixedBillItem[] = [
      {
        id: 'fb-1',
        name: 'Rent',
        amountVnd: 1500000,
        paymentHistory: { '2026-11': { status: 'PAID' } },
      },
      {
        id: 'fb-2',
        name: 'Internet',
        amountVnd: 300000,
        paymentHistory: { '2026-11': { status: 'UNPAID' } },
      },
    ]

    render(
      <ManageFixedBillsModal
        isOpen={true}
        onClose={mockOnClose}
        bills={mixedBills}
        onSaveBills={mockOnSaveBills}
        monthlyIncome={monthlyIncome}
        initialMonth="2026-11"
      />,
    )

    // Summary should show 1/2 bills (50%)
    expect(screen.getByText(/1\/2/)).toBeDefined()
    expect(screen.getByText(/50%/)).toBeDefined()

    // Filter by Unpaid
    const filterUnpaidBtn = screen.getByTestId('filter-unpaid')
    fireEvent.click(filterUnpaidBtn)

    // Internet is visible, Rent is hidden
    expect(screen.queryByText('Internet')).not.toBeNull()
    expect(screen.queryByText('Rent')).toBeNull()

    // Summary still shows 1/2 bills (50%)!
    expect(screen.getByText(/1\/2/)).toBeDefined()

    // Filter by Paid
    const filterPaidBtn = screen.getByTestId('filter-paid')
    fireEvent.click(filterPaidBtn)

    // Rent is visible, Internet is hidden
    expect(screen.queryByText('Rent')).not.toBeNull()
    expect(screen.queryByText('Internet')).toBeNull()
  })

  it('adds a new bill and defaults its status to UNPAID', () => {
    render(
      <ManageFixedBillsModal
        isOpen={true}
        onClose={mockOnClose}
        bills={initialBills}
        onSaveBills={mockOnSaveBills}
        monthlyIncome={monthlyIncome}
        initialMonth="2026-11"
      />,
    )

    const nameInput = screen.getByPlaceholderText(/tên khoản|bill name/i)
    const amountInput = screen.getByPlaceholderText(/số tiền|amount/i)
    const addBtn = screen.getByRole('button', { name: /thêm|add/i })

    fireEvent.change(nameInput, { target: { value: 'Điện nước' } })
    fireEvent.change(amountInput, { target: { value: '600000' } })
    fireEvent.click(addBtn)

    expect(mockOnSaveBills).toHaveBeenCalledTimes(1)
    const savedBills: FixedBillItem[] = mockOnSaveBills.mock.calls[0][0]
    expect(savedBills).toHaveLength(3)
    const newBill = savedBills.find((b) => b.name === 'Điện nước')
    expect(newBill).toBeDefined()
    expect(newBill?.amountVnd).toBe(600000)
    // No historical records created
    expect(newBill?.paymentHistory).toEqual({})
  })

  it('edits a bill and preserves its payment history', () => {
    const billsWithPaidItem: FixedBillItem[] = [
      {
        id: 'fb-1',
        name: 'Tiền nhà cũ',
        amountVnd: 1500000,
        paymentHistory: {
          '2026-11': { status: 'PAID', paidAt: '2026-11-05T00:00:00.000Z' },
        },
      },
    ]

    render(
      <ManageFixedBillsModal
        isOpen={true}
        onClose={mockOnClose}
        bills={billsWithPaidItem}
        onSaveBills={mockOnSaveBills}
        monthlyIncome={monthlyIncome}
        initialMonth="2026-11"
      />,
    )

    // Click edit button
    const editBtn = screen.getByLabelText(/sửa|edit/i)
    fireEvent.click(editBtn)

    // Name input appears with existing value
    const editInputs = screen.getAllByRole('textbox')
    const nameEditInput = editInputs[editInputs.length - 2]
    fireEvent.change(nameEditInput, { target: { value: 'Tiền nhà mới' } })

    // Save edit button (Check)
    const saveEditBtn = screen.getByLabelText(/lưu|save/i)
    fireEvent.click(saveEditBtn)

    expect(mockOnSaveBills).toHaveBeenCalled()
    const lastSaved: FixedBillItem[] = mockOnSaveBills.mock.calls[mockOnSaveBills.mock.calls.length - 1][0]
    expect(lastSaved[0].name).toBe('Tiền nhà mới')
    // Payment history is preserved
    expect(lastSaved[0].paymentHistory?.['2026-11']?.status).toBe('PAID')
  })

  it('deletes a bill and removes it from saved list', () => {
    render(
      <ManageFixedBillsModal
        isOpen={true}
        onClose={mockOnClose}
        bills={initialBills}
        onSaveBills={mockOnSaveBills}
        monthlyIncome={monthlyIncome}
        initialMonth="2026-11"
      />,
    )

    const deleteBtns = screen.getAllByLabelText(/xóa|delete/i)
    fireEvent.click(deleteBtns[0])

    expect(mockOnSaveBills).toHaveBeenCalledTimes(1)
    const savedBills: FixedBillItem[] = mockOnSaveBills.mock.calls[0][0]
    expect(savedBills).toHaveLength(1)
    expect(savedBills[0].id).toBe('fb-2')
  })

  it('closes modal when clicking close button or Save & Apply button', () => {
    render(
      <ManageFixedBillsModal
        isOpen={true}
        onClose={mockOnClose}
        bills={initialBills}
        onSaveBills={mockOnSaveBills}
        monthlyIncome={monthlyIncome}
        initialMonth="2026-11"
      />,
    )

    const applyAndCloseBtn = screen.getByRole('button', { name: /xong & áp dụng|save/i })
    fireEvent.click(applyAndCloseBtn)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })
})
