const { render, screen } = require('@testing-library/react');
const StaffDashboard = require('../StaffDashboard'); // Adjust the import based on your actual component

test('renders staff dashboard', () => {
	render(<StaffDashboard />);
	const linkElement = screen.getByText(/staff dashboard/i);
	expect(linkElement).toBeInTheDocument();
});